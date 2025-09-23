# GraphQL

The frontend uses graphql-request with React Query. GraphQL is used for authentication and notifications; on-chain interactions use viem/wagmi.

## Client setup

- Include Authorization header if a JWT is present.
- Handle UNAUTHORIZED errors by clearing token and prompting re-auth.

## Operations

- validateToken on app init to determine auth state.
```graphql
query { validateToken { valid wallet } }
```

- SIWE:
```graphql
mutation($address: String!) { generateSiweMessage(address: $address) { message nonce } }
mutation($message: String!, $signature: String!) {
  authenticateWithSiwe(message: $message, signature: $signature) { success token wallet error }
}
```

- Notifications:
```graphql
query($page: PageParam!) {
  getMyNotifications(pageParam: $page) {
    notifications { id data read createdAt }
    startIndex
    total
  }
}
query { getMyUnreadNotificationsCount }
mutation($id: PositiveInt!) { markNotificationAsRead(id: $id) { success } }
mutation { markAllNotificationsAsRead { success } }
```

## Real-time updates

WebSockets are used for real-time notification delivery. The server emits WebSocketMessageType.NotificationReceived with the persisted notification payload. Update UI/react-query caches on receipt.

See:
- src/shared/websocket/socket-manager.ts
- src/server/bootstrap.ts

## On-chain operations

Use viem/wagmi/RainbowKit for blockchain interactions. Do not use GraphQL for token CRUD or deployments.

## Error handling

- On GraphQL errors with extensions.code = "UNAUTHORIZED": clear token and prompt re-auth.
- Validate inputs (e.g., PositiveInt for notification ID).
- Surface server error messages from authenticateWithSiwe.error to the user.
