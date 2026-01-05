# Authentication

QuickDapp uses Sign-In With Ethereum (SIWE) and JWT for authentication. The flow is implemented entirely via GraphQL.

## Flow

1) Client calls generateSiweMessage(address, chainId, domain) to receive a SIWE message + nonce. The domain is validated against WEB3_ALLOWED_SIWE_ORIGINS.
2) Wallet signs the message.
3) Client calls authenticateWithSiwe(message, signature).
4) Server verifies the signature, creates/ensures user record, issues a JWT.
5) Client sends JWT in Authorization: Bearer &lt;token&gt; for subsequent requests.
6) validateToken can be used to check token validity.

## GraphQL operations

- Generate message:
```graphql
mutation($address: String!, $chainId: Int!, $domain: String!) {
  generateSiweMessage(address: $address, chainId: $chainId, domain: $domain) { message nonce }
}
```

- Authenticate:
```graphql
mutation($message: String!, $signature: String!) {
  authenticateWithSiwe(message: $message, signature: $signature) {
    success
    token
    wallet
    error
  }
}
```

- Validate token:
```graphql
query { validateToken { valid wallet } }
```

## Enforcement

- The @auth directive protects user-specific queries/mutations:
  - getMyNotifications
  - getMyUnreadNotificationsCount
  - markNotificationAsRead
  - markAllNotificationsAsRead

Unauthorized requests result in extensions.code = "UNAUTHORIZED".

## Security notes

- Store JWT securely (in-memory or secure storage). Avoid localStorage if possible; if used, handle logout and token refresh explicitly.
- Client provides domain and chainId; server validates domain against WEB3_ALLOWED_SIWE_ORIGINS.
- JWT expiry and validation are enforced server-side.
