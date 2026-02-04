---
order: 70
---

# Notifications

QuickDapp provides a real-time notification system that persists to the database and delivers instantly via WebSocket. Notifications can be created from resolvers, workers, or any code with `ServerApp` access.

## How It Works

When a notification is created, two things happen simultaneously:

1. The notification is inserted into the `notifications` database table
2. A WebSocket message is sent to the user's connected browser sessions

This dual approach means notifications are never lost — even if the user is offline, they'll see them when they next load the app via the database query.

## Creating Notifications

Use `serverApp.createNotification()` from anywhere with `ServerApp` access:

```typescript
await serverApp.createNotification(userId, {
  type: "order_completed",
  message: "Your order has been processed",
  orderId: "12345"
})
```

The `data` field is a JSON object — store whatever your notification type needs. The `type` field is a string you define per notification kind.

### From Resolvers

```typescript
const resolvers = {
  Mutation: {
    completeOrder: async (_, { orderId }, context) => {
      const { serverApp, user } = context
      // ... process order ...
      await serverApp.createNotification(user.id, {
        type: "order_completed",
        message: "Your order is ready"
      })
    }
  }
}
```

### From Worker Jobs

Workers send notifications through IPC — the main server process handles the actual WebSocket delivery:

```typescript
export const processOrderJob: Job = {
  async run({ serverApp, job }) {
    // ... process order ...
    await serverApp.createNotification(job.userId, {
      type: "order_shipped",
      message: "Your order has shipped"
    })
  }
}
```

## Data Model

The `notifications` table stores:

| Field | Type | Description |
|-------|------|-------------|
| `id` | serial | Primary key |
| `userId` | integer | Owner of the notification |
| `data` | JSON | Notification payload (type, message, custom fields) |
| `read` | boolean | Whether the user has seen it |
| `createdAt` | timestamp | When it was created |

## Frontend Integration

### useNotifications Hook

The [`useNotifications`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/hooks/useNotifications.ts) hook subscribes to real-time WebSocket events:

```typescript
useNotifications({
  onNotificationReceived: (notification) => {
    // Update React Query cache, show toast, etc.
  }
})
```

### NotificationsIndicator

The [`NotificationsIndicator`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/components/notifications/NotificationsIndicator.tsx) shows a bell icon in the header. When unread notifications exist, it displays a badge with the count. Clicking it opens the notifications dialog.

The unread count is fetched via the `getMyUnreadNotificationsCount` GraphQL query and updated in real-time when new notifications arrive via WebSocket.

### NotificationsDialog

The [`NotificationsDialog`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/components/notifications/NotificationsDialog.tsx) displays a paginated list of notifications with:

- Infinite scroll for loading older notifications
- "Mark as read" for individual notifications
- "Mark all as read" button
- React Query cache integration for instant UI updates

### NotificationComponents

The [`NotificationComponents`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/components/notifications/NotificationComponents.tsx) file contains renderers for different notification types. Each notification type gets its own display component based on the `data.type` field.

## Custom Notification Types

To add a new notification type:

1. **Define the type constant** and the data shape for your notification
2. **Create notifications** using `serverApp.createNotification()` with your type
3. **Add a renderer** in `NotificationComponents.tsx` to display the notification's content

## GraphQL Operations

Two queries and two mutations handle notification management:

- `getMyNotifications(pageParam)` — Paginated fetch with `startIndex` and `perPage`
- `getMyUnreadNotificationsCount` — Count for the badge
- `markNotificationAsRead(id)` — Mark a single notification as read
- `markAllNotificationsAsRead` — Mark all notifications as read

All notification operations require authentication via the `@auth` directive.
