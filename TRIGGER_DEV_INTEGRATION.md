# Trigger.dev Integration - Quick Start

This integration allows you to use Trigger.dev's robust execution while maintaining complete database tracking for resilience and control.

## ✅ What You Get

- **Database as source of truth**: All jobs tracked in PostgreSQL
- **Server restart resilience**: Jobs automatically reconciled on startup
- **Cancellation control**: Cancel jobs at any time, even mid-execution
- **Trigger.dev benefits**: Retries, cron, auto-scaling, no timeouts, checkpointing
- **Unified API**: Same interface for both internal and Trigger.dev jobs

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
npm install @trigger.dev/sdk@latest
```

### 2. Add Environment Variables

```env
TRIGGER_SECRET_KEY=tr_dev_xxxxx
TRIGGER_PROJECT_REF=proj_xxxxx
TRIGGER_WEBHOOK_SECRET=whsec_xxxxx
```

### 3. Run Migration

```bash
bun run gen       # Generate migration
bun run db push   # Apply to database
```

This adds Trigger.dev tracking columns to the `worker_jobs` table.

### 4. Initialize Trigger.dev

```bash
npx trigger.dev@latest init
```

Creates `/trigger` directory for your tasks.

## 📝 Basic Usage

### Schedule a One-Time Job

```typescript
import { scheduleUnifiedJob } from "@/server/jobs"

const job = await scheduleUnifiedJob(serverApp, {
  tag: "process-dataset-123",
  type: "process-large-dataset",
  userId: user.id,
  executor: "trigger",
  triggerTaskId: "process-large-dataset",
  data: { datasetId: "123" },
  retryConfig: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2,
  },
})

console.log(`Job ID: ${job.id}, Run ID: ${job.triggerRunId}`)
```

### Schedule a Cron Job

```typescript
import { scheduleUnifiedCronJob } from "@/server/jobs"

const cronJob = await scheduleUnifiedCronJob(
  serverApp,
  {
    tag: "daily-report",
    type: "daily-report",
    userId: 0,
    executor: "trigger",
    triggerTaskId: "daily-report-generation",
    data: {},
  },
  "0 0 * * *" // Daily at midnight
)
```

### Cancel a Job

```typescript
import { cancelJob } from "@/server/jobs"

await cancelJob(serverApp, jobId)
// Cancels both in database AND on Trigger.dev
```

### Create a Trigger.dev Task

```typescript
// trigger/my-task.ts
import { task } from "@trigger.dev/sdk/v3"

export const myTask = task({
  id: "my-task",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  run: async (payload: { userId: number; data: string }) => {
    // Your task logic here
    console.log("Processing:", payload)

    return { success: true, processedAt: new Date() }
  },
})
```

## 🔧 Integration Points

### 1. Server Bootstrap (Reconciliation)

Add to your server startup:

```typescript
import { reconcileTriggerJobs, syncActiveTriggerJobs } from "@/server/jobs"

// On server start
if (serverConfig.TRIGGER_ENABLED) {
  const report = await reconcileTriggerJobs(serverApp)
  console.log("Reconciled:", report)

  // Periodic sync every 5 minutes
  setInterval(() => syncActiveTriggerJobs(serverApp), 5 * 60 * 1000)
}
```

### 2. Webhook Endpoint

Create webhook route (e.g., `src/server/api/routes/trigger.ts`):

```typescript
import { Elysia } from "elysia"
import { handleTriggerWebhook } from "@/server/jobs"

export const triggerRoutes = (serverApp: ServerApp) => {
  return new Elysia({ prefix: "/trigger" })
    .post("/webhook", async ({ body }) => {
      await handleTriggerWebhook(serverApp, body as any)
      return { success: true }
    })
}
```

Configure webhook URL in Trigger.dev dashboard:
- URL: `https://your-domain.com/api/trigger/webhook`
- Events: `RUN_STARTED`, `RUN_COMPLETED`, `RUN_FAILED`, `RUN_CANCELED`

## 🔍 Monitoring Jobs

### Query Active Jobs

```sql
SELECT id, type, trigger_status, started, finished, trigger_run_id
FROM worker_jobs
WHERE executor = 'trigger' AND finished IS NULL;
```

### Check Failed Jobs

```sql
SELECT id, type, result, created_at
FROM worker_jobs
WHERE executor = 'trigger' AND success = false
ORDER BY created_at DESC
LIMIT 10;
```

### Find Orphaned Jobs

```typescript
const report = await reconcileTriggerJobs(serverApp)
console.log("Orphaned:", report.orphanedJobs)
```

## 📚 Architecture

```
┌─────────────────────────────────────────────┐
│         Your Application                    │
│                                             │
│  scheduleUnifiedJob()                       │
│         │                                   │
│         ├──▶ PostgreSQL (worker_jobs)       │
│         │    └── Source of truth            │
│         │                                   │
│         └──▶ Trigger.dev API                │
│              └── Execution engine           │
│                     │                       │
│              ┌──────┴──────┐               │
│              │             │               │
│         Webhooks    Reconciliation         │
│              │             │               │
│              └─────┬───────┘               │
│                    ▼                       │
│           Updates database                 │
│           with status                      │
└─────────────────────────────────────────────┘
```

## 📖 Full Documentation

See `docs/trigger-dev-integration.md` for:
- Complete API reference
- Advanced patterns (job registry, GraphQL integration)
- Testing strategies
- Troubleshooting guide
- Migration from internal workers

## 🎯 Key Files Created

- `src/server/db/schema.ts` - Enhanced with Trigger.dev fields
- `src/server/jobs/trigger-adapter.ts` - Scheduling & cancellation
- `src/server/jobs/trigger-webhook.ts` - Status sync handler
- `src/server/jobs/trigger-reconcile.ts` - Startup reconciliation
- `src/server/jobs/index.ts` - Unified exports
- `trigger/example-task.ts` - Example tasks
- `docs/trigger-dev-integration.md` - Full documentation

## 🚨 Important Notes

1. **Database is source of truth**: Never bypass the adapter functions
2. **Reconciliation on startup**: Automatically syncs unfinished jobs
3. **Webhooks required**: Configure for real-time status updates
4. **Cancel safely**: Use `cancelJob()` to cancel both systems
5. **Bun compatibility**: Tasks run with Bun, but CLI uses Node.js

## 💡 When to Use Trigger.dev vs Internal Workers

**Use Trigger.dev for:**
- Long-running tasks (>5 minutes)
- Resource-intensive jobs (AI/ML, data processing)
- Jobs requiring guaranteed execution
- Tasks needing auto-scaling

**Keep internal workers for:**
- High-frequency polling (blockchain watching)
- Simple database operations
- Tasks requiring WebSocket notifications
- Quick maintenance jobs

## ❓ Quick Troubleshooting

**Jobs not syncing?**
→ Check webhook configuration and logs

**Orphaned jobs after restart?**
→ Reconciliation should auto-fix on startup

**Can't cancel a job?**
→ Check that job has `triggerRunId` in database

**Server restart and jobs lost?**
→ Check reconciliation ran: `grep "trigger-reconcile" logs/`

---

For detailed documentation, see: `docs/trigger-dev-integration.md`
