---
order: 40
---

# Real-time notifications

QuickDapp uses [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) for real-time communication between the backend and connected frontends. 

When the backend creates a otification, it gets saved to the database and immediately pushed to the user's active browser sessions if the user is currently logged in and using the web app.

## How It Works

Frontends connect to the backend websocket endpoint after the user has authenticated. From then on, any notification created for that user gets delivered instantly.

Note that a single user can have multiple browser tabs open, and each receives the same notifications.

When a [background worker](../worker/index.md) creates a notification it sends a message to the main server process, which then routes the message through to the user's connected browser sessions.

## Message Types

Messages are defined in [`src/shared/websocket/types.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/packages/base/src/shared/websocket/types.ts):

- `Connected` — Initial connection acknowledgment
- `Registered` — User registration successful
- `NotificationReceived` — New notification with id, userId, data, createdAt, read
- `Error` — Connection errors (limit exceeded, invalid token)

This file also contains various Typescript enum and type definitions to make generating handling real-time messages easy.

## Customization

New messages types and their associated Typescript enums and definitions can be added to [`src/shared/websocket/types.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/packages/base/src/shared/websocket/types.ts).

The (`src/server/ws/index.ts`)[https://github.com/QuickDapp/QuickDapp/blob/main/packages/base/src/server/ws/index.ts] file contains handlers for the various message types. You can choose to extend this file or you could use the [Chain-of-responsibility design pattern](https://refactoring.guru/design-patterns/chain-of-responsibility) to extend it in a cleaner way.

_Note: you will need to update the frontend [socket](../frontend/socket.md) code too to support your new message types._

## Connection Limits

The server enforces connection limits through configuration:

- `SOCKET_MAX_TOTAL_CONNECTIONS` — Global limit across all users
- `SOCKET_MAX_CONNECTIONS_PER_USER` — Per-user limit

When limits are exceeded, the connection receives an `Error` message and closes.

## Bi-directional messaging

Websockets don't just allow for real-time message delivery of data to connected frontend clients, but also for clients to send messages in real-time to the server as efficiently as possible.

This means you could technically build a system whereby frontend clients can message each other in real-time via the server. This is exactly how a chatroom with server-side persistent storage of the chats would work.

However, for a multiplayer game where minimizing latency is a critical objective, this `client <-> server <-> client` setup would be inferior to a `client <-> client` setup using [WebRTC](https://webrtc.org/). 

When deciding what communication method to use - whether that be GraphQL, Websocket and/or WebRTC - it's important to understand the trade-offs presented by each one. 