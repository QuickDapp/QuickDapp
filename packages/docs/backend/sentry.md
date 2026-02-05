---
order: 10
---

# Sentry

QuickDapp integrates with [Sentry](https://sentry.io/) for error tracking and performance monitoring. When configured, Sentry captures unhandled exceptions, logs errors, and traces performance across server and worker processes.

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SENTRY_DSN` | No | — | Sentry DSN for the main server process |
| `SENTRY_WORKER_DSN` | No | — | Sentry DSN for worker processes (can be same or different project) |
| `SENTRY_TRACES_SAMPLE_RATE` | No | `0` | Fraction of requests to trace (0.0 to 1.0) |
| `SENTRY_PROFILE_SESSION_SAMPLE_RATE` | No | `0` | Fraction of sessions to profile (0.0 to 1.0) |

Set `SENTRY_DSN` to enable Sentry for the main server. Set `SENTRY_WORKER_DSN` to enable it for background workers. If you only set one, only that process type will report to Sentry.

## Initialization

Sentry initializes during server and worker startup before any other code runs:

- **Server**: Initialized in `start-server.ts` if `SENTRY_DSN` is set
- **Worker**: Initialized in `start-worker.ts` if `SENTRY_WORKER_DSN` is set

```typescript
initializeSentry({
  dsn: serverConfig.SENTRY_DSN,
  environment: serverConfig.NODE_ENV,
  tracesSampleRate: serverConfig.SENTRY_TRACES_SAMPLE_RATE,
  profileSessionSampleRate: serverConfig.SENTRY_PROFILE_SESSION_SAMPLE_RATE,
})
```

## User Context

Link errors to specific users with `setSentryUser()` and `clearSentryUser()`. These functions update the Sentry scope so all subsequent errors include user information:

```typescript
import { setSentryUser, clearSentryUser } from "./lib/sentry"

// After authentication succeeds
setSentryUser({ id: user.id })

// After logout
clearSentryUser()
```

When a user is set, Sentry events include their ID, making it easier to trace issues affecting specific accounts.

## Performance Tracing

Use `startSpan()` to trace performance-sensitive operations. The function is available on `ServerApp` and wraps your code in a Sentry span:

```typescript
const result = await serverApp.startSpan("fetchUserData", async (span) => {
  // Your code here
  return await db.query.users.findFirst({ where: eq(users.id, userId) })
})
```

Spans appear in Sentry's Performance dashboard, showing execution time and call hierarchies. Set `SENTRY_TRACES_SAMPLE_RATE` to control what fraction of requests are traced.

## Log Transport

The `SentryTransport` class bridges the `@hiddentao/logger` library with Sentry's logging system. When Sentry is configured, this transport is automatically added to the root logger:

```typescript
if (serverConfig.SENTRY_DSN) {
  logger.addTransport(new SentryTransport())
}
```

By default, the transport sends ERROR level logs and above to Sentry. You can configure the minimum level:

```typescript
new SentryTransport({ minLevel: LogLevel.WARN })
```

Logs appear in Sentry with their category and metadata preserved.

## Error Capture

QuickDapp captures errors at multiple levels:

**Uncaught Exceptions and Unhandled Rejections**

Both server and worker processes register handlers that capture exceptions and rejections before exiting:

```typescript
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception:", error)
  Sentry.captureException(error)
  process.exit(1)
})
```

**Elysia Error Handler**

The server's global error handler captures unexpected errors during request processing:

```typescript
app.onError(({ error, set, request }) => {
  Sentry.captureException(error)
  set.status = 500
  return { error: "Internal server error" }
})
```

This ensures errors that escape your handlers still reach Sentry before returning a 500 response.

## Graceful Shutdown

When the server or worker shuts down, `Sentry.close()` flushes pending events:

```typescript
if (serverConfig.SENTRY_DSN) {
  await Sentry.close(2000)  // Wait up to 2 seconds
  logger.info("Sentry events flushed")
}
```

This ensures errors captured just before shutdown are not lost.
