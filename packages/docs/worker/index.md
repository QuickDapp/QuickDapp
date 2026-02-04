---
order: 93
icon: Cog
expanded: true
---

# Worker

QuickDapp's worker system handles background jobs through child processes and a database-backed queue. Jobs run independently of HTTP requests, making them suitable for tasks that shouldn't block the request-response cycle.

## Why Workers?

Many operations don't belong inside an HTTP request handler:

- **Sending emails** — Delivering verification codes or notifications without blocking the API response
- **Processing uploaded files** — Parsing, transforming, or importing data in the background
- **Scheduled maintenance** — Cleaning old data, generating reports, running periodic checks
- **Monitoring external services** — Polling APIs or other systems for changes
- **Long-running computations** — Any task that takes too long for a request-response cycle

The worker system lets you schedule these as jobs that run independently, with automatic retry, cron scheduling, and full access to the database and other services.

## Architecture

The [`WorkerManager`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/workers/index.ts) spawns child processes that poll the `workerJobs` table for pending work. Each worker gets a full `ServerApp` instance with database access and logging.

Workers communicate with the main server through IPC messages. When a worker needs to send a WebSocket notification, it sends an IPC message that the main process routes through the `SocketManager`. This allows workers to trigger real-time updates without direct socket access.

The number of workers is configurable via `WORKER_COUNT`. Set it to `cpus` for auto-scaling based on CPU cores, or a specific number for fixed worker count.

## Built-in Jobs

One job type comes pre-configured:

[`removeOldWorkerJobs`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/workers/jobs/removeOldWorkerJobs.ts) cleans up completed jobs from the database. It runs on a cron schedule to prevent table bloat.

!!!
Variants may add additional built-in jobs. For example, the [Web3 variant](../variants/web3/index.md) adds blockchain event monitoring and contract deployment jobs.
!!!

## Job Lifecycle

Jobs flow through these states:

1. **Scheduled** — Job inserted into `workerJobs` with a `due` timestamp
2. **Started** — Worker picks up the job and sets `started` timestamp
3. **Finished** — Job completes with `finished` timestamp and `success` flag
4. **Removed** — Cleanup job deletes old completed entries

Jobs can be configured for automatic rescheduling on failure with configurable delays. Cron-scheduled jobs automatically reschedule themselves after completion.

## Submitting Jobs

Submit jobs through the `WorkerManager`:

```typescript
await serverApp.workerManager.submitJob({
  tag: "my-job",
  type: "myCustomJob",
  userId: user.id,
  data: { customField: "value" }
})
```

The `tag` field identifies the job for logging and debugging. The `type` must match a registered job in the [`jobRegistry`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/workers/jobs/registry.ts).

## Configuration

```bash
WORKER_COUNT=cpus       # Number of workers ('cpus' or integer)
WORKER_LOG_LEVEL=info   # Log level for worker processes
```

See [Adding Jobs](./adding-jobs.md) for creating custom job types, [Background Jobs](./background-jobs.md) for implementation details, and [Best Practices](./best-practices.md) for guidelines on writing reliable jobs.
