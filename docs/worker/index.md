# Worker

The QuickDapp worker system provides simple background job processing for maintenance tasks. It uses child processes and a database-backed queue for basic job scheduling and execution.

## Architecture

The worker system is simple and focused:

* **WorkerManager** - Manages worker processes with basic start/stop functionality
* **Job Queue** - Database storage using the `workerJobs` table
* **Job Types** - Three built-in job types for system maintenance
* **Scheduling** - Cron-based scheduling with automatic rescheduling

## Key Features

### Simple Process Model
Workers run as child processes:
* Basic process isolation for job execution
* Configurable worker count (including auto-scaling with 'cpus')
* Graceful shutdown support

### Database Storage
Jobs are stored in the `workerJobs` table:
* **Persistence** - Jobs survive server restarts
* **Scheduling** - Time-based execution with `due` timestamps
* **Status Tracking** - Simple success/failure tracking
* **Cleanup** - Automatic removal of old jobs

## Built-in Job Types

QuickDapp includes three system maintenance jobs:

### removeOldWorkerJobs
Cleans up old completed worker jobs:

```typescript
// Scheduled maintenance job
// Runs periodically to clean up old completed jobs
```

### watchChain
Monitors blockchain events and processes new transactions:

```typescript
// Blockchain monitoring job
// Watches for contract events and processes them
```

### deployMulticall3
Deploys the Multicall3 contract if not present:

```typescript
// Contract deployment job
// Ensures Multicall3 is available on the current chain
```

## Worker Configuration

Configure workers through environment variables:

```bash
WORKER_COUNT=cpus        # Number of worker processes ('cpus' for auto-scale)
WORKER_LOG_LEVEL=info    # Worker-specific log level
```

## Basic Usage

The worker system is automatically started with the server and runs maintenance tasks in the background. Jobs are scheduled automatically based on cron expressions and system needs.

### WorkerManager Interface

The WorkerManager provides a simple interface:

```typescript
interface WorkerManager {
  submitJob(job: WorkerJob): Promise<WorkerJob>
  getWorkerCount(): number
  shutdown(): Promise<void>
}
```

### Job Structure

Jobs in the database have this structure:

```typescript
interface WorkerJob {
  id: number
  type: 'removeOldWorkerJobs' | 'watchChain' | 'deployMulticall3'
  userId: number
  data: any
  due: Date
  started?: Date
  finished?: Date
  success?: boolean
  result?: any
  cronSchedule?: string
  persistent: boolean
}
```

## Monitoring

The worker system provides basic status information through health endpoints and logs. Workers automatically handle failures and reschedule jobs when appropriate.

For more details on adding custom jobs, see [Adding Jobs](./adding-jobs.md).