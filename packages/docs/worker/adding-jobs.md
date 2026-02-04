---
order: 70
---

# Adding Jobs

To add a custom job type, create a job file, define its data type, and register it in the job registry.

## Create the Job File

Jobs are defined in [`src/server/workers/jobs/`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/workers/jobs/). Each job exports a `Job` object with a `run` function:

```typescript
// src/server/workers/jobs/myCustomJob.ts
import type { Job, JobParams } from "./types"

export const myCustomJob: Job = {
  async run({ serverApp, log, job }: JobParams) {
    log.info("Starting custom job", { jobId: job.id })

    // Access database
    const result = await serverApp.db.select().from(users)

    // Create notifications
    await serverApp.createNotification(job.userId, {
      type: "job_completed",
      message: "Your job finished"
    })

    log.info("Job completed", { jobId: job.id })
  }
}
```

The `JobParams` object provides:
- `serverApp` — Full access to database, notifications, and other services
- `log` — Logger scoped to this job execution
- `job` — The job record including `id`, `type`, `data`, `userId`

## Define Data Types

Add your job's data type in [`src/server/workers/jobs/types.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/workers/jobs/types.ts):

```typescript
export interface MyCustomJobData {
  targetUserId: number
  action: string
}

export type JobType =
  | "removeOldWorkerJobs"
  | "myCustomJob"  // Add your type
```

## Register the Job

Add your job to the [`jobRegistry`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/workers/jobs/registry.ts):

```typescript
import { myCustomJob } from "./myCustomJob"

export const jobRegistry: JobRegistry = {
  removeOldWorkerJobs: removeOldWorkerJobsJob,
  myCustomJob: myCustomJob,
}
```

## Submit Jobs

Once registered, submit jobs from anywhere with `ServerApp` access:

```typescript
await serverApp.workerManager.submitJob({
  tag: "process-user-42",
  type: "myCustomJob",
  userId: currentUser.id,
  data: { targetUserId: 42, action: "sync" }
})
```

For more guidelines on writing reliable jobs, see [Best Practices](./best-practices.md).
