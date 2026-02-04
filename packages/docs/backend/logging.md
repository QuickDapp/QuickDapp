---
order: 20
---

# Logging

QuickDapp uses a structured logging system built on [`@hiddentao/logger`](https://github.com/hiddentao/logger) with console and Sentry transports. Every part of the application—resolvers, workers, database operations—logs through categorized logger instances.

## Architecture

The logging system has three layers:

1. **Root logger** — Created at startup with a base category (e.g. "server" or "worker")
2. **Child loggers** — Created via `serverApp.createLogger(category)` for specific subsystems
3. **Transports** — Console output with timestamps, and optionally Sentry for error capture

## Log Categories

Predefined categories keep logs organized and filterable:

| Category | Used By |
|----------|---------|
| `auth` | Authentication operations |
| `graphql` | GraphQL handler lifecycle |
| `graphql-resolvers` | Individual resolver execution |
| `database` | Database connection and query management |
| `worker-manager` | Worker process spawning and IPC |
| `worker` | Individual worker job execution |

Categories are defined in [`src/server/lib/logger.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/lib/logger.ts) as `LOG_CATEGORIES`.

## Usage

Create a logger from the ServerApp:

```typescript
const log = serverApp.createLogger("my-service")

log.info("Processing request", { userId: 42 })
log.debug("Detailed data", { payload })
log.error("Operation failed", error)
```

In worker jobs, the logger is provided via the job parameters:

```typescript
export const myJob: Job = {
  async run({ log, job }) {
    log.info("Starting job", { jobId: job.id })
    // ...
    log.info("Job complete")
  }
}
```

## Log Levels

Five levels are available, from most to least verbose:

| Level | Use |
|-------|-----|
| `debug` | Detailed diagnostic information |
| `info` | Normal operational messages |
| `warn` | Unexpected but recoverable situations |
| `error` | Failures that need attention |
| `fatal` | Critical errors that may crash the process |

Set the minimum level via environment variables:

```bash
LOG_LEVEL=info            # Server process log level
WORKER_LOG_LEVEL=info     # Worker process log level
```

## Transports

### Console Transport

Always enabled. Outputs log messages with ISO timestamps and category prefixes:

```
2026-01-29T05:08:33.934Z [info] <server> 🚀 QuickDapp server started
2026-01-29T05:08:34.123Z [info] <graphql> Processing query: getMyNotifications
```

### Sentry Transport

Enabled when `SENTRY_DSN` is configured. Routes `error` and `fatal` level messages to Sentry for centralized error tracking. The transport attaches:

- Log category as context
- Any metadata passed to the log call
- Stack traces for error objects

## Performance Spans

The `startSpan()` function integrates with Sentry's performance monitoring to trace operation duration:

```typescript
const result = await serverApp.startSpan("db.getNotifications", async () => {
  return await getNotifications(db, userId, pageParam)
})
```

Spans are used throughout the codebase for:
- Database operations
- GraphQL resolver execution
- External API calls

This provides visibility into where time is spent during request processing.

## Configuration

```bash
LOG_LEVEL=info                          # trace|debug|info|warn|error
WORKER_LOG_LEVEL=info                   # Same options, for worker processes
SENTRY_DSN=                             # Sentry DSN for error tracking
SENTRY_TRACES_SAMPLE_RATE=1.0           # Percentage of requests to trace
SENTRY_PROFILE_SESSION_SAMPLE_RATE=1.0  # Percentage of sessions to profile
```

See [`src/server/lib/logger.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/lib/logger.ts) for the logger implementation and [`src/server/lib/sentry.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/lib/sentry.ts) for the Sentry transport.
