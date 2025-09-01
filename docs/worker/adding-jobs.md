# Adding Jobs

QuickDapp includes a simple worker system for background job processing. The system handles three main job types for maintenance and blockchain operations.

## Existing Job Types

The worker system includes these built-in job types:

### removeOldWorkerJobs
Cleans up old completed worker jobs from the database:

```typescript
// Job runs automatically to remove old jobs
// No custom configuration needed
```

### watchChain
Monitors blockchain events and transactions:

```typescript
// Watches for specific contract events
// Handles transaction confirmations
// Updates application state based on blockchain changes
```

### deployMulticall3
Deploys Multicall3 contract for batch operations:

```typescript
// One-time deployment job
// Enables efficient batch contract calls
// Configures contract addresses in application
```

## Job Structure

All jobs follow this basic pattern:

```typescript
// Job handler interface
export type JobHandler<T = any> = (
  job: Job & { data: T },
  context: { serverApp: ServerApp }
) => Promise<any>
```

### Job Data Format

Jobs are stored in the database with this structure:

```typescript
interface Job {
  id: number
  type: 'removeOldWorkerJobs' | 'watchChain' | 'deployMulticall3'
  userId: number
  data: any
  status: 'pending' | 'running' | 'completed' | 'failed'
  due: Date
  attempts: number
  createdAt: Date
  updatedAt: Date
}
```

## Adding Custom Jobs

To create a new job type, follow these steps:

### 1. Create Job Handler

Create a new job handler file:

```typescript
// src/server/workers/jobs/myJob.ts
import type { JobHandler } from './types'
import { createLogger } from '../../lib/logger'

const logger = createLogger('job-my-job')

export interface MyJobData {
  userId: number
  parameters: Record<string, any>
}

export const myJobHandler: JobHandler<MyJobData> = async (job, { serverApp }) => {
  const { userId, parameters } = job.data
  
  logger.info('Starting custom job', { jobId: job.id, userId })
  
  try {
    // Your job logic here
    const result = await processJob(parameters, serverApp)
    
    logger.info('Job completed', { jobId: job.id, result })
    return result
    
  } catch (error) {
    logger.error('Job failed', { jobId: job.id, error: error.message })
    throw error
  }
}

async function processJob(params: any, serverApp: any) {
  // Implement your job logic
  return { success: true }
}
```

### 2. Register Job Handler

Add your job to the registry:

```typescript
// src/server/workers/jobs/registry.ts
import { myJobHandler } from './myJob'

export const jobHandlers = {
  removeOldWorkerJobs: removeOldWorkerJobsHandler,
  watchChain: watchChainHandler,
  deployMulticall3: deployMulticall3Handler,
  myJob: myJobHandler, // Add your job here
}
```

### 3. Update Types

Add your job type to the union:

```typescript
// src/server/workers/jobs/types.ts
export type JobType = 
  | 'removeOldWorkerJobs' 
  | 'watchChain' 
  | 'deployMulticall3'
  | 'myJob' // Add your job type
```

### 4. Submit Jobs

Submit jobs from your application code:

```typescript
// Example: Submit a custom job
await serverApp.workerManager.submitJob('myJob', {
  userId: user.id,
  parameters: {
    action: 'processData',
    data: someData
  }
})
```

## Best Practices

### Job Design
- Keep jobs simple and focused on a single task
- Make jobs idempotent (safe to run multiple times)
- Handle errors gracefully with proper logging
- Use appropriate data types for job parameters

### Error Handling
- Always log job start and completion
- Include relevant context in error messages
- Let errors bubble up for retry handling
- Use structured logging for debugging

### Performance
- Keep job execution time reasonable (< 5 minutes)
- Use database transactions when needed
- Clean up resources after job completion
- Monitor job queue length and processing times

The worker system provides a simple foundation for background processing while keeping the complexity minimal for most use cases.