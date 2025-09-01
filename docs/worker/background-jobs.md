# Background Jobs

QuickDapp's worker system provides simple background job processing for system maintenance tasks. It uses child processes and a database-backed job queue for basic job scheduling and execution.

## System Overview

### Simple Architecture

The worker system consists of:

```typescript
// Simple worker architecture
Main Server Process
├── ElysiaJS HTTP Server
├── GraphQL API  
└── WorkerManager
    ├── Child Worker Processes (configurable count)
    └── Job Queue (workerJobs table)
```

### Job Processing

1. **Job Creation** - Jobs are inserted into the `workerJobs` database table
2. **Worker Polling** - Child processes poll the database for due jobs
3. **Job Execution** - Workers execute jobs and update status
4. **Cleanup** - Completed jobs are automatically removed based on `removeDelay`

## Built-in Job Types

QuickDapp includes three maintenance job types:

### removeOldWorkerJobs

Cleans up completed worker jobs from the database:

```typescript
// Automatic cleanup job
{
  type: 'removeOldWorkerJobs',
  data: {}, // No specific data needed
  cronSchedule: '0 2 * * *' // Daily at 2 AM
}
```

### watchChain

Monitors blockchain events and processes new transactions:

```typescript
// Blockchain monitoring job
{
  type: 'watchChain',
  data: {}, // No specific data needed
  cronSchedule: '*/30 * * * * *' // Every 30 seconds
}
```

### deployMulticall3

Ensures the Multicall3 contract is deployed on the current chain:

```typescript
// Contract deployment job
{
  type: 'deployMulticall3',
  data: {
    forceRedeploy?: boolean // Optional: force redeployment
  }
}
```

## Job Structure

Jobs in the `workerJobs` table have this simple structure:

```typescript
interface WorkerJob {
  id: number
  type: 'removeOldWorkerJobs' | 'watchChain' | 'deployMulticall3'
  userId: number
  data: any
  due: Date
  started?: Date
  finished?: Date
  removeAt: Date
  success?: boolean
  result?: any
  cronSchedule?: string
  autoRescheduleOnFailure: boolean
  autoRescheduleOnFailureDelay: number
  removeDelay: number
  persistent: boolean
}
```

## Job Handler Implementation

Each job type has a simple handler function:

```typescript
// src/server/workers/jobs/removeOldWorkerJobs.ts
import type { Job, JobParams } from './types'

export const removeOldWorkerJobsJob: Job = {
  async run({ serverApp, log, job }: JobParams) {
    log.info('Starting cleanup of old worker jobs', { jobId: job.id })
    
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
    
    const result = await serverApp.db
      .delete(workerJobs)
      .where(
        and(
          lt(workerJobs.removeAt, cutoffDate),
          isNotNull(workerJobs.finished)
        )
      )
    
    log.info('Cleanup completed', {
      jobId: job.id,
      deletedCount: result.rowCount
    })
    
    return { deletedCount: result.rowCount }
  }
}
```

### Job Registry

All jobs are registered in a simple registry:

```typescript
// src/server/workers/jobs/registry.ts
import { deployMulticall3Job } from './deployMulticall3'
import { removeOldWorkerJobsJob } from './removeOldWorkerJobs'
import { watchChainJob } from './watchChain'
import type { JobRegistry } from './types'

export const jobRegistry: JobRegistry = {
  removeOldWorkerJobs: removeOldWorkerJobsJob,
  watchChain: watchChainJob,
  deployMulticall3: deployMulticall3Job,
}
```

## Worker Configuration

Configure workers through environment variables:

```bash
# Worker settings
WORKER_COUNT=cpus        # Number of worker processes ('cpus' for auto-scale)
WORKER_LOG_LEVEL=info    # Worker-specific log level
```

## Submitting Jobs

Jobs are submitted through the WorkerManager:

```typescript
// Submit a maintenance job
const job = await serverApp.workerManager.submitJob({
  type: 'deployMulticall3',
  userId: 1,
  data: { forceRedeploy: false },
  due: new Date(),
  persistent: false,
  autoRescheduleOnFailure: true
})
```

## Cron Jobs

Maintenance jobs are automatically scheduled:

```typescript
// System automatically schedules maintenance jobs
// removeOldWorkerJobs: Daily at 2 AM
// watchChain: Every 30 seconds
// deployMulticall3: On startup if needed
```

## Monitoring

The worker system provides basic monitoring through:

- **Structured Logging** - All job execution is logged with job IDs and status
- **Database Status** - Job status stored in `workerJobs` table
- **Health Checks** - WorkerManager tracks worker process health

## Error Handling

Simple error handling with automatic rescheduling:

```typescript
// Jobs can be configured to reschedule on failure
interface WorkerJob {
  autoRescheduleOnFailure: boolean // Reschedule if job fails
  autoRescheduleOnFailureDelay: number // Delay in seconds
  removeDelay: number // When to remove completed jobs
}
```

The worker system is designed to be simple and focused on essential maintenance tasks, providing a solid foundation for QuickDapp's background processing needs without unnecessary complexity.