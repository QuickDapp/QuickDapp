---
order: 60
---

# Best Practices

Guidelines for writing reliable, efficient background jobs.

## Idempotency

Design jobs to be safely re-runnable. If a job fails mid-execution and gets rescheduled, it should handle duplicate processing gracefully:

```typescript
async run({ serverApp, log, job }) {
  // Check if the work was already done
  const existing = await serverApp.db.select()
    .from(processedItems)
    .where(eq(processedItems.externalId, job.data.externalId))
    .then(rows => rows[0])

  if (existing) {
    log.info("Already processed, skipping")
    return
  }

  // Do the actual work
  await processItem(serverApp, job.data)
}
```

Use unique constraints in the database to prevent duplicate records even if the check-then-act pattern has a race condition.

## Error Handling

Let errors bubble up — the worker system records failures and handles retries based on job configuration. Log context before throwing so the error is debuggable:

```typescript
async run({ serverApp, log, job }) {
  const result = await fetchExternalData(job.data.url)

  if (!result.ok) {
    log.error("External API returned error", {
      status: result.status,
      jobId: job.id
    })
    throw new Error(`API returned ${result.status}`)
  }

  // Process result...
}
```

## Duration

Keep jobs focused and short. For long-running work, break it into chains of smaller jobs:

```typescript
// Instead of one massive job, chain them
async run({ serverApp, log, job }) {
  const batch = await getNextBatch(serverApp, job.data.cursor)

  await processBatch(serverApp, batch)

  if (batch.hasMore) {
    // Schedule continuation
    await serverApp.workerManager.submitJob({
      tag: `process-batch-${batch.nextCursor}`,
      type: "processBatch",
      userId: 0,
      data: { cursor: batch.nextCursor }
    })
  }
}
```

## Database Transactions

Use `withTransaction` for operations that need atomicity. The transaction wrapper handles serialization conflicts automatically with retries:

```typescript
import { withTransaction } from "../../db/shared"

async run({ serverApp, log, job }) {
  await withTransaction(serverApp.db, async (tx) => {
    const [user] = await tx.insert(users).values({}).returning()
    await tx.insert(userAuth).values({
      userId: user.id,
      authType: "email",
      authIdentifier: job.data.email
    })
  })
}
```

## Monitoring

Use structured logging with job IDs for tracing. The `log` parameter is already scoped to the job:

```typescript
log.info("Processing started", { itemCount: items.length })
log.debug("Item details", { item })
log.info("Processing complete", { processed: items.length })
```

Check the `workerJobs` table to monitor execution patterns:

```sql
-- Recent failures
SELECT type, tag, result, finished
FROM worker_jobs
WHERE success = false
ORDER BY finished DESC
LIMIT 20;

-- Average execution time by type
SELECT type, AVG(EXTRACT(EPOCH FROM (finished - started))) as avg_seconds
FROM worker_jobs
WHERE finished IS NOT NULL
GROUP BY type;
```

## Resource Management

Worker processes use smaller database connection pools (2 connections vs 10 for the main server). Be mindful of concurrent database operations within a job — avoid opening many parallel queries.

## Job Deduplication

Use tags to prevent scheduling duplicate jobs:

```typescript
// Check if a job with this tag is already pending
const existing = await serverApp.db.select()
  .from(workerJobs)
  .where(and(
    eq(workerJobs.tag, `sync-user-${userId}`),
    isNull(workerJobs.started)
  ))
  .then(rows => rows[0])

if (!existing) {
  await serverApp.workerManager.submitJob({
    tag: `sync-user-${userId}`,
    type: "syncUser",
    userId,
    data: {}
  })
}
```

## Cron Scheduling

For recurring jobs, use cron expressions. Keep frequency appropriate for the task — polling too often wastes resources:

```typescript
await serverApp.workerManager.submitJob({
  tag: "cleanup",
  type: "removeOldWorkerJobs",
  userId: 0,
  cronSchedule: "0 0 * * * *",  // Every hour
  persistent: true
})
```

The `persistent` flag ensures the job survives server restarts. Without it, cron jobs need to be re-submitted on startup.

## Testing

Test jobs in isolation using the test helpers:

```typescript
import { startTestServer } from "../helpers/server"

test("my job processes correctly", async () => {
  const { serverApp } = await startTestServer()

  // Set up test data
  await serverApp.db.insert(items).values({ ... })

  // Run the job directly
  const log = serverApp.createLogger("test")
  await myJob.run({
    serverApp,
    log,
    job: { id: 1, type: "myJob", data: { ... }, userId: 0 }
  })

  // Verify results
  const result = await serverApp.db.select().from(items)
  expect(result).toHaveLength(1)
})
```
