---
order: 50
---

# Authentication

QuickDapp uses a stateless [JSON web token](https://grokipedia.com/page/JSON_Web_Token) (JWT) to store user authentication information.

Although this could be passed to the backend via a cookie the base QuickDapp codebase instead opts for storing this in the browser's [localStorage](https://grokipedia.com/page/Web_storage). 

Altogether this results in a lightweight authentication mechanism that also prevents [CSRF attacks](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/CSRF) from occurring.

This page covers the server-side implementation. For information on the user-facing side and flows (email, OAuth) see [Users > Authentication](../users/authentication.md).

## JWT implementation

Tokens are signed using the `HS256` algorithm using the `SESSION_ENCRYPTION_KEY` [environment variable](../environment-variables.md) as the encryption key. 

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

## GraphQL authentication

Authenticated [GraphQL operations](./graphql.md) require a valid JWT in the `Authorization` HTTP header. 

The validation pipeline runs in the following order:

1. **Extract** — Pull the `Bearer` token from the `Authorization` header.
2. **Verify** — Check the JWT signature and expiration.
3. **Load user** — Fetch the user record from the database by ID.
4. **Check disabled** — Verify the user's `disabled` flag is set to false.
5. **Attach to context** — Make the user available to GraphQL resolvers.

When an unauthenticated request tries to access a protected operation, it returns a GraphQL error with `extensions.code = "UNAUTHORIZED"`. Mixed queries containing both public and protected fields fail entirely when unauthenticated — no partial data is returned.

## Error Codes

The authentication system uses specific error codes defined in [`src/shared/graphql/errors.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/packages/base/src/shared/graphql/errors.ts):

| Code | When |
|------|------|
| `UNAUTHORIZED` | No token provided, or token is invalid/expired |
| `AUTHENTICATION_FAILED` | Credentials are incorrect (wrong code, bad signature) |
| `ACCOUNT_DISABLED` | Token is valid but the user account is disabled |

## Adding a new authentication type

To add a custom authentication type (e.g. phone number, passkey):

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

