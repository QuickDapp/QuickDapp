---
order: 30
---

# Logging

QuickDapp uses a structured logging system built on [`@hiddentao/logger`](https://github.com/hiddentao/logger) with console and [cloud-based logging](../monitoring/logs.md) support. 

Every part of the application — resolvers, workers, database operations — logs through categorized logger instances.

Log categories make it easy to separate log messages in logging output and understand where a given log message originates from.

## Architecture

The logging system has three layers:

1. **Root logger** — Created at startup with a base category (e.g. `server` or `worker`).
2. **Child loggers** — Created via `serverApp.createLogger(category)` for specific subsystems.
3. **Transports** — Different output destinations, e.g console, cloud, etc.

## Log Categories

Here are some of the predefined categories keep logs organized and filterable:

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

For any given logger instance a child-logger can be created which adds the new logger category as a suffix of the parent category. For example:

```typescript
log.info('test') // <parent> [info] test

const childLogger = log.child('happy')
childLogger.info('test') // <parent/happy> [info] test
```

In [worker](../worker/index.md) jobs, the logger is provided via the job parameters:

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

Set the minimum level via [environment variables](../environment-variables.md):

```bash
LOG_LEVEL=info            # Server process log level
WORKER_LOG_LEVEL=info     # Worker process log level
```

Any messages logged at the minimum severity level will be silently discarded. This allows you to control how verbose logging should be. For example, if there are backend errors that you're struggling to resolve you may choose to set `LOG_LEVEL` to `debug` temporarily to get more detailed logging output in order to help resolve the issue.


## Transports

Logging transports are output destinations for log messages. This section documents the available built-in logger transports.

### Console

Source: [console.ts](https://github.com/hiddentao/logger/blob/main/src/transports/console.ts).

Always enabled. Outputs log messages with ISO timestamps and category prefixes:

```
2026-01-29T05:08:33.934Z [info] <server> 🚀 QuickDapp server started
2026-01-29T05:08:34.123Z [info] <graphql> Processing query: getMyNotifications
```

### Sentry

Source: [sentry.ts](https://github.com/QuickDapp/QuickDapp/blob/main/packages/base/src/server/lib/sentry.ts).

Enabled when [Sentry monitoring](../monitoring/index.md) is enabled.

Routes log messages to Sentry for centralized logs tracking. The transport attaches:

- Log category as context
- Any metadata passed to the log call
- Stack traces for error objects

### Custom

You can add your own custom logging transports. Your transport only has to implement the following interface.

```typescript
/**
 * Transport interface for logger output
 */
export interface Transport {
  /**
   * Write a log message to this transport
   */
  write(entry: LogEntry): void
}
```

Please refer to [@hiddentao/logger](https://github.com/hiddentao/logger) for more information.