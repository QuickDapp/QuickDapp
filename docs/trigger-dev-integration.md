# Trigger.dev Integration Guide

Complete guide for using Trigger.dev with QuickDapp's database-tracked job system.

## Overview

This integration provides the best of both worlds:
- **Trigger.dev**: Robust execution, auto-scaling, retries, no timeouts
- **Local Database**: Complete job tracking, server restart resilience, cancellation control

### Key Features

✅ All jobs tracked in PostgreSQL database
✅ Survives server restarts - jobs continue executing
✅ Cancel jobs at any time (even mid-execution)
✅ Real-time status sync via webhooks
✅ Automatic reconciliation on startup
✅ Cron scheduling with Trigger.dev reliability
✅ Unified API for both internal and Trigger.dev jobs

---

## Setup

### 1. Install Trigger.dev

```bash
npm install @trigger.dev/sdk@latest
npx trigger.dev@latest init
```

This creates a `/trigger` directory with example tasks.

### 2. Configure Environment Variables

Add to `.env`:

```bash
# Trigger.dev configuration
TRIGGER_SECRET_KEY=tr_dev_xxxxx     # From Trigger.dev dashboard
TRIGGER_PROJECT_REF=proj_xxxxx      # From Trigger.dev dashboard
TRIGGER_WEBHOOK_SECRET=whsec_xxxxx  # For webhook verification
```

### 3. Run Database Migration

```bash
bun run gen    # Generate migration from updated schema
bun run db push  # Apply to database
```

This adds the following columns to `worker_jobs`:
- `executor` - "internal" or "trigger"
- `triggerRunId` - Trigger.dev run ID
- `triggerAttemptId` - Current attempt ID
- `triggerStatus` - Current status from Trigger.dev
- `triggerScheduleId` - For cron jobs
- `cancelRequested` - Flag for cancellation
- `lastSyncedAt` - Last webhook sync timestamp

### 4. Configure Webhooks

In the Trigger.dev dashboard:

1. Go to Project Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/api/trigger/webhook`
3. Subscribe to events: `RUN_STARTED`, `RUN_COMPLETED`, `RUN_FAILED`, `RUN_CANCELED`
4. Copy the webhook secret to `.env` as `TRIGGER_WEBHOOK_SECRET`

### 5. Add Webhook Endpoint

Create `src/server/api/routes/trigger-webhook.ts`:

```typescript
import { Elysia } from "elysia"
import type { ServerApp } from "../../types"
import { handleTriggerWebhook, verifyWebhookSignature } from "../../jobs/trigger-webhook"
import { serverConfig } from "../../../shared/config/server"

export const triggerWebhookRoutes = (serverApp: ServerApp) => {
  return new Elysia({ prefix: "/trigger" })
    .post("/webhook", async ({ body, headers }) => {
      const signature = headers["trigger-signature"]
      const rawBody = JSON.stringify(body)

      // Verify webhook signature
      if (!verifyWebhookSignature(
        rawBody,
        signature,
        serverConfig.trigger.webhookSecret
      )) {
        return { error: "Invalid signature" }
      }

      // Process webhook
      await handleTriggerWebhook(serverApp, body as any)

      return { success: true }
    })
}
```

Register in your main API router.

---

## Usage

### Scheduling a One-Time Job

```typescript
import { scheduleUnifiedJob } from "./server/jobs/trigger-adapter"

// Schedule a Trigger.dev job
const job = await scheduleUnifiedJob(serverApp, {
  tag: "process-dataset-123",
  type: "process-large-dataset",
  userId: user.id,
  executor: "trigger",
  triggerTaskId: "process-large-dataset",
  data: {
    datasetId: "123",
    userId: user.id
  },
  due: new Date(Date.now() + 60000), // Run in 1 minute
  retryConfig: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2
  }
})

console.log(`Job created: ${job.id}, Trigger run: ${job.triggerRunId}`)
```

### Scheduling a Cron Job

```typescript
import { scheduleUnifiedCronJob } from "./server/jobs/trigger-adapter"

// Daily report at midnight UTC
const cronJob = await scheduleUnifiedCronJob(
  serverApp,
  {
    tag: "daily-report",
    type: "daily-report-generation",
    userId: 0, // System job
    executor: "trigger",
    triggerTaskId: "daily-report-generation",
    data: {},
    persistent: true, // Don't auto-delete
  },
  "0 0 * * *" // Cron expression
)

console.log(`Cron job scheduled: ${cronJob.triggerScheduleId}`)
```

### Canceling a Job

```typescript
import { cancelJob } from "./server/jobs/trigger-adapter"

// Cancel by job ID
await cancelJob(serverApp, jobId)

// This will:
// 1. Mark as canceled in database
// 2. Cancel the run on Trigger.dev
// 3. Prevent any further execution
```

### Canceling a Cron Schedule

```typescript
import { cancelCronSchedule } from "./server/jobs/trigger-adapter"

// Stop recurring job
await cancelCronSchedule(serverApp, cronJobId)
```

### Checking Job Status

```typescript
import { getJobById } from "./server/db/worker"

const job = await getJobById(serverApp, jobId)

console.log({
  status: job.triggerStatus,  // PENDING, EXECUTING, COMPLETED, FAILED, CANCELED
  started: job.started,
  finished: job.finished,
  success: job.success,
  result: job.result,
  runId: job.triggerRunId
})
```

---

## Server Startup Integration

Add reconciliation to server bootstrap:

```typescript
// In src/server/bootstrap.ts or similar

import { reconcileTriggerJobs, syncActiveTriggerJobs } from "./jobs/trigger-reconcile"

export async function bootstrapServer(serverApp: ServerApp) {
  // ... other bootstrap code

  // Reconcile Trigger.dev jobs on startup
  if (serverConfig.trigger.enabled) {
    const report = await reconcileTriggerJobs(serverApp)
    console.log("Trigger.dev reconciliation:", report)

    // Setup periodic sync (every 5 minutes)
    setInterval(async () => {
      await syncActiveTriggerJobs(serverApp)
    }, 5 * 60 * 1000)
  }
}
```

---

## Job Registry Pattern

Create a centralized registry for all jobs:

```typescript
// src/server/jobs/registry.ts

import type { JobExecutor } from "./trigger-adapter"

export interface JobDefinition {
  executor: JobExecutor
  triggerTaskId?: string
  workerJobType?: string
  description: string
  retryConfig?: {
    maxAttempts: number
    minTimeoutInMs: number
    maxTimeoutInMs: number
    factor: number
  }
}

export const JOB_REGISTRY = {
  // Internal workers (fast, simple tasks)
  removeOldWorkerJobs: {
    executor: "internal" as const,
    workerJobType: "removeOldWorkerJobs",
    description: "Clean up old completed jobs",
  },
  watchChain: {
    executor: "internal" as const,
    workerJobType: "watchChain",
    description: "Monitor blockchain for events",
  },

  // Trigger.dev jobs (heavy, long-running tasks)
  processLargeDataset: {
    executor: "trigger" as const,
    triggerTaskId: "process-large-dataset",
    description: "Process large dataset with heavy computation",
    retryConfig: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
  dailyReportGeneration: {
    executor: "trigger" as const,
    triggerTaskId: "daily-report-generation",
    description: "Generate daily analytics report",
  },
  reliableEmailSender: {
    executor: "trigger" as const,
    triggerTaskId: "reliable-email-sender",
    description: "Send emails with automatic retries",
    retryConfig: {
      maxAttempts: 5,
      minTimeoutInMs: 2000,
      maxTimeoutInMs: 60000,
      factor: 2,
    },
  },
} as const satisfies Record<string, JobDefinition>

export type JobName = keyof typeof JOB_REGISTRY
```

### Using the Registry

```typescript
import { JOB_REGISTRY } from "./jobs/registry"
import { scheduleUnifiedJob } from "./jobs/trigger-adapter"

async function scheduleDataProcessing(datasetId: string, userId: number) {
  const jobDef = JOB_REGISTRY.processLargeDataset

  return await scheduleUnifiedJob(serverApp, {
    tag: `process-${datasetId}`,
    type: "processLargeDataset",
    userId,
    executor: jobDef.executor,
    triggerTaskId: jobDef.triggerTaskId,
    retryConfig: jobDef.retryConfig,
    data: { datasetId, userId },
  })
}
```

---

## GraphQL Integration

Add job management to your GraphQL API:

```typescript
// In src/shared/graphql/mutations.ts

export const cancelJobMutation = `
  mutation CancelJob($jobId: Int!) {
    cancelJob(jobId: $jobId) {
      id
      success
      finished
      result
    }
  }
`

// In src/server/graphql/resolvers.ts

import { cancelJob } from "../jobs/trigger-adapter"

export const resolvers = {
  Mutation: {
    cancelJob: async (_parent: any, args: { jobId: number }, ctx: any) => {
      // Verify user has permission to cancel this job
      const job = await getJobById(ctx.serverApp, args.jobId)
      if (!job) throw new Error("Job not found")
      if (job.userId !== ctx.userId && ctx.userId !== 0) {
        throw new Error("Unauthorized")
      }

      return await cancelJob(ctx.serverApp, args.jobId)
    }
  }
}
```

---

## Testing

### Integration Test Example

```typescript
import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { scheduleUnifiedJob, cancelJob } from "../src/server/jobs/trigger-adapter"
import { getJobById } from "../src/server/db/worker"

describe("Trigger.dev Integration", () => {
  test("should schedule and track job", async () => {
    const job = await scheduleUnifiedJob(serverApp, {
      tag: "test-job-1",
      type: "test-task",
      userId: 1,
      executor: "trigger",
      triggerTaskId: "process-large-dataset",
      data: { test: true }
    })

    expect(job.executor).toBe("trigger")
    expect(job.triggerRunId).toBeDefined()
    expect(job.triggerStatus).toBe("PENDING")

    // Wait for completion (or use webhook in real tests)
    await new Promise(resolve => setTimeout(resolve, 10000))

    const updated = await getJobById(serverApp, job.id)
    expect(updated?.finished).toBeDefined()
  })

  test("should cancel job", async () => {
    const job = await scheduleUnifiedJob(serverApp, {
      tag: "test-job-2",
      type: "cancellable-task",
      userId: 1,
      executor: "trigger",
      triggerTaskId: "cancellable-task",
      data: { iterations: 100 }
    })

    // Cancel immediately
    await cancelJob(serverApp, job.id)

    const canceled = await getJobById(serverApp, job.id)
    expect(canceled?.cancelRequested).toBe(true)
    expect(canceled?.triggerStatus).toBe("CANCELED")
  })
})
```

---

## Monitoring

### View Job Status in Database

```sql
-- All active Trigger.dev jobs
SELECT
  id,
  type,
  trigger_status,
  started,
  finished,
  success,
  trigger_run_id
FROM worker_jobs
WHERE executor = 'trigger'
  AND finished IS NULL
ORDER BY created_at DESC;

-- Failed jobs in last 24 hours
SELECT
  id,
  type,
  result,
  created_at
FROM worker_jobs
WHERE executor = 'trigger'
  AND success = false
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Jobs waiting for reconciliation (no run ID yet)
SELECT id, type, created_at
FROM worker_jobs
WHERE executor = 'trigger'
  AND trigger_run_id IS NULL
  AND finished IS NULL;
```

### Logging

All components use structured logging:

```typescript
import { logger } from "./server/lib/logger"

const log = logger({ category: "my-component" })

log.info("Job scheduled", { jobId, runId })
log.warn("Job retry attempted", { jobId, attempt })
log.error("Job failed", { jobId, error })
```

---

## Best Practices

### 1. Use Tags for Deduplication

```typescript
// Only one "user-123-report" job can be pending at a time
await scheduleUnifiedJob(serverApp, {
  tag: `user-${userId}-report`,  // Unique tag
  type: "generate-report",
  // ...
})
```

### 2. Set Appropriate Retry Configs

```typescript
// For critical jobs
retryConfig: {
  maxAttempts: 5,
  minTimeoutInMs: 2000,
  maxTimeoutInMs: 60000,
  factor: 2,
  randomize: true  // Prevents thundering herd
}

// For idempotent jobs
retryConfig: {
  maxAttempts: 3,
  minTimeoutInMs: 1000,
  maxTimeoutInMs: 10000,
  factor: 2
}
```

### 3. Use Persistent Flag for Important Jobs

```typescript
await scheduleUnifiedJob(serverApp, {
  // ...
  persistent: true,  // Won't be auto-deleted
  removeDelay: 30 * 24 * 60 * 60 * 1000  // Keep for 30 days
})
```

### 4. Handle Cancellation in Tasks

```typescript
export const myTask = task({
  id: "my-task",
  run: async (payload, { ctx }) => {
    for (const item of items) {
      // Check for cancellation
      if (ctx.run.isCancelled) {
        throw new Error("Task canceled")
      }

      await processItem(item)
    }
  }
})
```

### 5. Use Metadata for Searchability

```typescript
await tasks.trigger("my-task", payload, {
  metadata: {
    userId: user.id.toString(),
    department: "sales",
    priority: "high"
  },
  tags: ["sales", "priority-high"]
})
```

---

## Troubleshooting

### Jobs Not Syncing

1. Check webhook configuration in Trigger.dev dashboard
2. Verify webhook endpoint is accessible: `curl -X POST https://your-domain.com/api/trigger/webhook`
3. Check logs for webhook errors: `grep "trigger-webhook" logs/app.log`
4. Manually trigger reconciliation: Run `syncActiveTriggerJobs(serverApp)`

### Orphaned Jobs

Jobs in DB but not on Trigger.dev:

```typescript
// Reconciliation marks these as failed automatically
const report = await reconcileTriggerJobs(serverApp)
console.log("Orphaned jobs:", report.orphanedJobs)
```

### Server Restart Recovery

The system automatically reconciles on startup. To verify:

```bash
# Check startup logs
bun run prod | grep "trigger-reconcile"

# Should see:
# [trigger-reconcile] Starting Trigger.dev job reconciliation
# [trigger-reconcile] Found X unfinished Trigger.dev jobs
# [trigger-reconcile] Reconciliation complete
```

---

## Migration Path

### Migrating Existing Jobs to Trigger.dev

1. **Identify candidates**: Long-running, resource-intensive jobs
2. **Create Trigger.dev task**: Implement in `/trigger/`
3. **Update job scheduler**: Change `executor` to `"trigger"`
4. **Test in development**: Verify execution and status sync
5. **Deploy**: Jobs automatically route to Trigger.dev

### Example Migration

Before:
```typescript
await scheduleJob(serverApp, {
  tag: "heavy-job",
  type: "processData",
  userId: 1,
  data: { ... }
})
```

After:
```typescript
await scheduleUnifiedJob(serverApp, {
  tag: "heavy-job",
  type: "processData",
  userId: 1,
  executor: "trigger",  // ← Changed
  triggerTaskId: "process-data",  // ← Added
  data: { ... }
})
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Your Application                        │
│                                                              │
│  ┌──────────────┐         ┌─────────────────────────────┐  │
│  │   GraphQL    │────────▶│  Trigger Adapter            │  │
│  │   Mutations  │         │  (trigger-adapter.ts)       │  │
│  └──────────────┘         └─────────────────────────────┘  │
│                                     │                        │
│                        ┌────────────┼────────────┐          │
│                        ▼            ▼            ▼          │
│              ┌──────────────┐  ┌────────────┐  ┌─────────┐ │
│              │  PostgreSQL  │  │ Internal   │  │Trigger  │ │
│              │  worker_jobs │  │  Workers   │  │.dev API │ │
│              └──────────────┘  └────────────┘  └─────────┘ │
│                     │ ▲                              │      │
│                     │ │                              │      │
│                     │ └──────────────────────────────┘      │
│                     │         Webhook Sync                  │
│                     │                                       │
│              ┌──────▼──────────┐                           │
│              │  Reconciliation │                           │
│              │   (on startup)  │                           │
│              └─────────────────┘                           │
└─────────────────────────────────────────────────────────────┘

Flow:
1. App schedules job → Adapter creates DB record + triggers Trigger.dev
2. Trigger.dev executes → Sends webhooks → Adapter updates DB
3. Server restarts → Reconciliation syncs all unfinished jobs
4. User cancels → Adapter cancels both DB + Trigger.dev
```

---

## Summary

This integration gives you:

✅ **Complete tracking**: Every job in PostgreSQL, queryable anytime
✅ **Resilience**: Server restarts don't lose jobs
✅ **Control**: Cancel jobs even mid-execution
✅ **Reliability**: Trigger.dev handles retries, scaling, checkpointing
✅ **Flexibility**: Mix internal and Trigger.dev jobs seamlessly

All while maintaining QuickDapp's architecture patterns and conventions.
