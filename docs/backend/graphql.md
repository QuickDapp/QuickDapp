# GraphQL

QuickDapp exposes a GraphQL API via GraphQL Yoga integrated with ElysiaJS. The current API focuses on SIWE authentication and user notifications.

## Schema

```graphql
directive @auth on FIELD_DEFINITION

scalar DateTime
scalar JSON
scalar PositiveInt
scalar BigInt

type Notification {
  id: PositiveInt!
  userId: PositiveInt!
  data: JSON!
  createdAt: DateTime!
  read: Boolean!
}

type NotificationsResponse {
  notifications: [Notification]!
  startIndex: Int!
  total: Int!
}

type Success {
  success: Boolean!
}

type SiweMessageResult {
  message: String!
  nonce: String!
}

type AuthResult {
  success: Boolean!
  token: String
  wallet: String
  error: String
}

type ValidateTokenResult {
  valid: Boolean!
  wallet: String
}

input PageParam {
  startIndex: Int!
  perPage: Int!
}

type Query {
  validateToken: ValidateTokenResult!
  getMyNotifications(pageParam: PageParam!): NotificationsResponse! @auth
  getMyUnreadNotificationsCount: Int! @auth
}

type Mutation {
  generateSiweMessage(address: String!): SiweMessageResult!
  authenticateWithSiwe(message: String!, signature: String!): AuthResult!
  markNotificationAsRead(id: PositiveInt!): Success! @auth
  markAllNotificationsAsRead: Success! @auth
}
```

Notes:
- No User/Token CRUD or GraphQL subscriptions.
- @auth is enforced on user-specific fields; validateToken is public but uses the Authorization header if present.

## Example operations

- Token validation:
```graphql
query {
  validateToken { valid wallet }
}
```

- Generate SIWE message:
```graphql
mutation($address: String!) {
  generateSiweMessage(address: $address) { message nonce }
}
```

- Authenticate with SIWE:
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

- Get notifications (auth required):
```graphql
query($page: PageParam!) {
  getMyNotifications(pageParam: $page) {
    notifications { id data read createdAt }
    startIndex
    total
  }
}
```

- Get unread count (auth required):
```graphql
query { getMyUnreadNotificationsCount }
```

- Mark notification as read (auth required):
```graphql
mutation($id: PositiveInt!) {
  markNotificationAsRead(id: $id) { success }
}
```

- Mark all as read (auth required):
```graphql
mutation { markAllNotificationsAsRead { success } }
```

## Auth directive behavior

- Unauthorized access to @auth fields returns GraphQL errors with extensions.code = "UNAUTHORIZED".
- Mixed queries containing both public and @auth fields will error when unauthenticated; no partial data is returned.

See tests:
- tests/server/graphql/auth-directive.test.ts
- tests/server/graphql/auth.test.ts
- tests/server/graphql/queries.test.ts
- tests/server/graphql/mutations.test.ts
