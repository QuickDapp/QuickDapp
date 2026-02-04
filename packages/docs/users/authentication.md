---
order: 80
---

# Authentication

QuickDapp uses stateless JWT authentication with two provider options: email verification and OAuth. This page covers the authentication flows from the user's perspective. For backend implementation details (JWT internals, the `@auth` directive), see [Backend > Authentication](../backend/authentication.md).

## JWT Tokens

All authentication methods produce a JWT token signed with `SESSION_ENCRYPTION_KEY`. The token contains the user ID and expires after 24 hours. There's no session table—authentication state lives entirely in the token.

## Email Authentication

Email verification uses encrypted, stateless codes:

1. Client calls `sendEmailVerificationCode` with email address
2. Server generates a random code and encrypts it into a blob containing the code and expiration
3. Server sends the code via email
4. User enters the code they received
5. Client calls `authenticateWithEmail` with email, code, and blob
6. Server decrypts the blob, verifies the code matches and hasn't expired
7. Server finds or creates the user and returns a JWT

The blob approach means no database storage for pending verifications. Codes expire after a short window.

Email configuration requires `MAILGUN_*` environment variables for the email provider.

## OAuth Authentication

Six OAuth providers are supported: Google, Facebook, GitHub, X (Twitter), TikTok, and LinkedIn. The flow:

1. Client calls `getOAuthLoginUrl` with provider name and redirect URL
2. Server generates encrypted state containing PKCE challenge and redirect info
3. User is redirected to the OAuth provider's authorization page
4. After authorization, provider redirects to `/auth/callback/:provider`
5. Server exchanges the authorization code for tokens
6. Server fetches user info from the provider's API
7. Server finds or creates the user based on provider user ID
8. Server returns an HTML page that stores the JWT and redirects to the app

Each provider requires configuration:

```bash
OAUTH_GOOGLE_CLIENT_ID=...
OAUTH_GOOGLE_CLIENT_SECRET=...

OAUTH_GITHUB_CLIENT_ID=...
OAUTH_GITHUB_CLIENT_SECRET=...

# Similar for Facebook, X, TikTok, LinkedIn
```

The OAuth implementation uses the Arctic library and handles PKCE automatically for providers that support it.

## Adding Custom Authentication Methods

To add a new authentication method, follow these steps:

1. **Add auth type constant** — Define the new type in `src/shared/constants.ts`
2. **Create user lookup/creation** — Add a function in `src/server/db/users.ts` to find or create users by the new identifier
3. **Add authentication logic** — Implement verification in a new auth service method
4. **Create GraphQL mutation** — Add the mutation to the schema and implement the resolver
5. **Update frontend** — Create a login form that calls the new mutation

See [Backend > Authentication](../backend/authentication.md) for detailed implementation guidance.

## Frontend Integration

The [`AuthContext`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/contexts/AuthContext.tsx) exposes:

- `isAuthenticated` — Whether the user is logged in
- `isLoading` — Loading state during auth operations
- `error` — Error from failed auth attempts
- `authToken` — The current JWT (null if not authenticated)
- `profile` — The authenticated user's profile
- `email` — The authenticated user's email
- `login(token, profile)` — Store auth state after successful authentication
- `logout()` — Clear auth state
- `restoreAuth()` — Attempt to restore auth from stored token on app load

## Token Validation

Protected GraphQL operations use the `@auth` directive. The handler extracts the Bearer token, verifies it, loads the user, and checks the `disabled` flag. Invalid tokens return `UNAUTHORIZED`, disabled users return `ACCOUNT_DISABLED`. See [Backend > Authentication](../backend/authentication.md) for details.

## Security

**Encryption Key**: The `SESSION_ENCRYPTION_KEY` must be 32+ characters and kept secret. It signs JWTs and encrypts OAuth state.

**HTTPS**: Always use HTTPS in production. Tokens sent over HTTP can be intercepted.

**Token Storage**: The frontend stores tokens in localStorage. For higher security requirements, consider httpOnly cookies with CSRF protection.

See [`src/server/auth/`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/auth/) for the complete authentication implementation.
