---
order: 95
icon: Server
expanded: true
---

# Backend

The QuickDapp backend runs is built on [ElysiaJS](https://elysiajs.com/), a [Bun](https://bun.com)-native framework written in Typescript. 

Being strongly typed lays a foundation for writing good, clean code that minimizes common programming errors. 

As well as having an ElysiaJS base, the backend provides all of the following out of the box, with everything setup in a way to ensure adherence to best practices:

* [PostgreSQL database](https://www.postgresql.org/) (via [DrizzleORM](https://orm.drizzle.team/)) for storing data (e.g user profiles).
* [Websockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) for real-time bi-directional message sending between the backend and frontend.
* [OAuth authentiation](https://oauth.net/2/) as well as email verification for user sign-up and login.
* [GraphQL API](https://graphql.org) to make it easy for apps to speak to the back end.
* [Mailgun](https://mailgun.io) integration for sending email to users.
* [Sentry](https://sentry.io) for cloud-based performance [monitoring](../monitoring/index.md) and logging.
* [Background worker](../worker/index.md) system for scheduling and running long-running tasks in the background even where are not active users.

## The `ServerApp` object

Every part of the backend receives a `ServerApp` object containing all the services it needs:

```typescript
type ServerApp = {
  app: Elysia                                    // HTTP/WebSocket server
  db: Database                                   // Database connection
  rootLogger: Logger                             // Root logger
  createLogger: (category: string) => Logger     // Logger factory
  startSpan: typeof startSpan                    // Sentry performance tracing
  workerManager: WorkerManager                   // Background job manager
  socketManager: ISocketManager                  // WebSocket manager
  createNotification: (userId, data) => Promise  // Send notification to user
}
```

GraphQL resolvers receive this through their context. Worker jobs get it as their first parameter. Any service you build can accept `ServerApp` to access shared resources.

!!!
Variants may extend the `ServerApp` type with additional fields. For example, the [Web3 variant](../variants/web3/index.md) adds `publicClient` and `walletClient` for blockchain access.
!!!

See [`src/server/types.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/types.ts) for the complete `ServerApp` type definition.
