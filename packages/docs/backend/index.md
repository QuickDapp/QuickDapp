---
order: 95
icon: Server
expanded: true
---

# Backend

The QuickDapp backend runs on Bun with ElysiaJS as the web framework. Everything flows through the ServerApp pattern, which provides clean access to the database, logger, WebSocket manager, and worker system.

## Core Technologies

The backend uses Bun as its runtime and package manager. ElysiaJS handles HTTP and WebSocket connections, GraphQL Yoga provides the API layer, and DrizzleORM manages PostgreSQL access with full TypeScript integration.

## The ServerApp Pattern

Every part of the backend receives a `ServerApp` object containing all the services it needs:

```typescript
type ServerApp = {
  app: Elysia                                    // HTTP/WebSocket server
  db: Database                                   // DrizzleORM connection
  rootLogger: Logger                             // Root logger
  createLogger: (category: string) => Logger     // Logger factory
  startSpan: typeof startSpan                    // Sentry performance tracing
  workerManager: WorkerManager                   // Background job manager
  socketManager: ISocketManager                  // WebSocket manager
  createNotification: (userId, data) => Promise  // Send user notifications
}
```

GraphQL resolvers receive this through their context. Worker jobs get it as their first parameter. Any service you build can accept `ServerApp` to access shared resources.

!!!
Variants may extend the `ServerApp` type with additional fields. For example, the [Web3 variant](../variants/web3/index.md) adds `publicClient` and `walletClient` for blockchain access.
!!!

## Directory Structure

```
src/server/
├── auth/           # Authentication (email, OAuth)
├── bootstrap.ts    # ServerApp creation
├── db/             # Schema, queries, connection management
├── graphql/        # Resolvers and schema integration
├── lib/            # Logger, errors, crypto
├── services/       # Business logic services
├── start-server.ts # Server startup
├── start-worker.ts # Worker process startup
├── types.ts        # ServerApp type definition
├── workers/        # Background job system
└── ws/             # WebSocket implementation
```

## How Requests Flow

A GraphQL request arrives at ElysiaJS, which passes it to GraphQL Yoga. Yoga parses the query, checks for the `@auth` directive, and builds a context containing the `ServerApp` and authenticated user (if any). The resolver runs, queries the database through DrizzleORM, and returns the result.

WebSocket connections follow a similar pattern. Clients connect, optionally authenticate with a JWT, and receive real-time updates when notifications are created. The [`SocketManager`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/ws/index.ts) routes messages to specific users or broadcasts to everyone.

Background jobs get submitted to the database queue. Worker processes poll for pending jobs, execute them with full `ServerApp` access, and mark them complete. Workers can send WebSocket messages back through IPC to the main server process.

## Documentation

- [Bootstrap](./bootstrap.md) — How ServerApp gets created and configured
- [Database](./database.md) — Schema design, queries, and transaction handling
- [GraphQL](./graphql.md) — API schema, resolvers, and authentication
- [Authentication](./authentication.md) — JWT implementation, the `@auth` directive, and adding new auth methods
- [WebSockets](./websockets.md) — Real-time communication
- [Error Handling](./error-handling.md) — Error classes and GraphQL error codes
- [Logging](./logging.md) — Logger system, categories, and Sentry integration
- [Sentry](./sentry.md) — Error tracking and performance monitoring

See [`src/server/types.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/types.ts) for the complete `ServerApp` type definition.
