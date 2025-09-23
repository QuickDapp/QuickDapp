# WebSockets

QuickDapp uses WebSockets to push real‑time notifications to signed‑in users.

- What it’s for: instant delivery of new notifications created by the app and background workers.
- How it works: when a notification is saved to the database, the server broadcasts it to the user’s open sessions over WebSockets.

## Message

- Type: NotificationReceived
- Payload: { id, userId, data, createdAt, read }

## Client usage

- Connect after sign‑in, passing the JWT (e.g. as a query param).
- On NotificationReceived, update your UI state/cache.

Example:
```ts
const token = localStorage.getItem('auth-token')
if (token) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const ws = new WebSocket(`${proto}://${location.host}/ws?token=${encodeURIComponent(token)}`)
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data)
    if (msg?.type === 'NotificationReceived' || msg?.type === 1) {
      // msg.data is the notification { id, userId, data, createdAt, read }
    }
  }
}
```

Notes:
- Real‑time is via WebSockets only. No GraphQL subscriptions.
- Notifications are persisted before being sent.
