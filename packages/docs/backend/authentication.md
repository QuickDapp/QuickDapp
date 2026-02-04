---
order: 50
---

# Authentication

QuickDapp uses stateless JWT authentication on the backend. This page covers the server-side implementation: how tokens work, how the `@auth` directive protects operations, and how to add new authentication methods. For user-facing authentication flows (email, OAuth), see [Users > Authentication](../users/authentication.md).

## JWT Implementation

Tokens are signed with HS256 using the `SESSION_ENCRYPTION_KEY` environment variable. The auth service in [`src/server/auth/index.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/auth/index.ts) provides three core functions:

- `generateToken(payload)` — Creates a signed JWT with a 24-hour expiration
- `verifyToken(token)` — Validates signature and expiration, returns the payload
- `extractBearerToken(header)` — Extracts the token from an `Authorization: Bearer ...` header

The token payload includes:

```typescript
{
  type: "auth",        // Token type identifier
  userId: number,      // Database user ID
  iat: number,         // Issued-at timestamp (seconds)
  iatMs: number,       // Issued-at timestamp (milliseconds)
  jti: string          // Unique token ID
}
```

## The @auth Directive

GraphQL operations marked with `@auth` require a valid JWT in the Authorization header. The GraphQL handler extracts auth requirements at startup by parsing the schema and checks them before running resolvers.

The validation pipeline runs in order:

1. **Extract** — Pull the Bearer token from the Authorization header
2. **Verify** — Check the JWT signature and expiration
3. **Load user** — Fetch the user record from the database by ID
4. **Check disabled** — Verify the user's `disabled` flag is false
5. **Attach to context** — Make the user available to resolvers

When an unauthenticated request tries to access a protected operation, it returns a GraphQL error with `extensions.code = "UNAUTHORIZED"`. Mixed queries containing both public and protected fields fail entirely when unauthenticated—no partial data is returned.

## Error Codes

The authentication system uses specific error codes defined in [`src/shared/graphql/errors.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/src/shared/graphql/errors.ts):

| Code | When |
|------|------|
| `UNAUTHORIZED` | No token provided, or token is invalid/expired |
| `AUTHENTICATION_FAILED` | Credentials are incorrect (wrong code, bad signature) |
| `ACCOUNT_DISABLED` | Token is valid but the user account is disabled |

## Adding a New Authentication Method

To add a custom authentication method (e.g. phone number, passkey):

**1. Add the auth type constant** in `src/shared/constants.ts`:

```typescript
export const AUTH_METHOD = {
  EMAIL: "email",
  PHONE: "phone",  // new
  // ... OAuth providers
} as const
```

**2. Create user lookup/creation** in `src/server/db/users.ts`:

```typescript
export async function findOrCreateUserByPhone(
  db: Database,
  phoneNumber: string,
) {
  return withTransaction(db, async (tx) => {
    const existing = await tx.select()
      .from(userAuth)
      .where(and(
        eq(userAuth.authType, AUTH_METHOD.PHONE),
        eq(userAuth.authIdentifier, phoneNumber),
      ))
      .then(rows => rows[0])

    if (existing) {
      return tx.select().from(users)
        .where(eq(users.id, existing.userId))
        .then(rows => rows[0])
    }

    const [user] = await tx.insert(users).values({}).returning()
    await tx.insert(userAuth).values({
      userId: user.id,
      authType: AUTH_METHOD.PHONE,
      authIdentifier: phoneNumber,
    })
    return user
  })
}
```

**3. Add the GraphQL mutation** in `src/shared/graphql/schema.ts`:

```graphql
type Mutation {
  authenticateWithPhone(phone: String!, code: String!): AuthResult!
}
```

**4. Implement the resolver** in `src/server/graphql/resolvers.ts`:

```typescript
authenticateWithPhone: async (_, { phone, code }, context) => {
  // Verify the code, find or create user, generate JWT
  const user = await findOrCreateUserByPhone(context.serverApp.db, phone)
  const token = await generateToken({ userId: user.id })
  return { success: true, token }
}
```

**5. Update the frontend** to call the new mutation from a login form.

## Security

**Encryption Key**: The `SESSION_ENCRYPTION_KEY` must be at least 32 characters and kept secret. It signs JWTs and encrypts OAuth state. The server validates this on startup.

**HTTPS**: Always use HTTPS in production. Tokens sent over HTTP can be intercepted.

**Token Storage**: The frontend stores tokens in localStorage. For higher security requirements, consider httpOnly cookies with CSRF protection.

See [`src/server/auth/`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/auth/) for the complete authentication implementation.
