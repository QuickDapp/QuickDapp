# Redis + BullMQ Worker System Implementation Plan

## Overview

Migration from database-based job queue to Redis + BullMQ for improved performance, reliability, and observability. Uses a **hybrid concurrency model** combining multi-process worker architecture (for CPU isolation) with BullMQ's event-loop concurrency (for I/O parallelism).

## Architecture Design

### Concurrency Model Comparison

#### Current: Database Polling with Subprocesses
```
Main Process
├── Worker Process 1 - Polls DB every 1s → Process 1 job sequentially
├── Worker Process 2 - Polls DB every 1s → Process 1 job sequentially  
├── Worker Process 3 - Polls DB every 1s → Process 1 job sequentially
└── Worker Process 4 - Polls DB every 1s → Process 1 job sequentially

Issues: Database contention, inefficient polling, underutilized I/O capacity
```

#### New: Hybrid Redis + BullMQ Model
```
Main Process
├── Worker Process 1 (Redis push-based)
│   ├── Job 1 (async I/O)
│   ├── Job 2 (async I/O)
│   ├── Job 3 (async I/O)
│   └── Job 4 (async I/O) // concurrency: 4
├── Worker Process 2 (Redis push-based)
│   ├── Job 5 (async I/O)
│   └── Job 6 (async I/O) // concurrency: 2
└── Worker Process N...

Benefits: 
- CPU isolation via multiple processes
- Efficient I/O via BullMQ event-loop concurrency  
- No database contention (Redis atomic job assignment)
- Total capacity = processes × concurrency per process
```

### Performance Characteristics

| Task Type | Current Subprocesses | BullMQ Hybrid | 
|-----------|---------------------|---------------|
| **CPU-bound** (blockchain processing) | ✅ Excellent (true parallelism) | ✅ Excellent (process isolation) |
| **I/O-bound** (database, network) | ⚠️ Underutilized (1 job/process) | ✅ Excellent (async concurrency) |
| **Job distribution** | ❌ DB lock contention | ✅ Redis atomic operations |
| **Memory efficiency** | ❌ High overhead | ✅ Shared event loop |
| **Crash isolation** | ✅ Process boundaries | ✅ Process boundaries |

## Phase 1: Environment Configuration

### 1.1 Update .env (development)
```bash
# Redis connection (required in all environments for consistency)
REDIS_URL=redis://localhost:6379

# Simplified Worker Configuration with smart defaults
WORKER_COUNT=cpus                    # Keep existing subprocess management
WORKER_QUEUE_CONCURRENCY=5           # Per-process job concurrency
WORKER_QUEUE_JOB_ATTEMPTS=3          # Retry failed jobs up to 3 times
WORKER_QUEUE_STALLED_INTERVAL=30000  # Check for stalled jobs every 30s
```

### 1.2 Update .env.test (isolated test environment)
```bash
# Separate Redis instance on different port for complete isolation
REDIS_URL=redis://localhost:6380

# Minimal settings for faster test execution
WORKER_COUNT=1                       # Single process for tests
WORKER_QUEUE_CONCURRENCY=1           # Sequential processing for predictable tests
WORKER_QUEUE_JOB_ATTEMPTS=1          # No retries in tests
WORKER_QUEUE_STALLED_INTERVAL=5000   # Faster stalled job detection
```

## Phase 2: Development & Test Script Enhancements

### 2.1 Create scripts/shared/redis-manager.ts
Shared Redis container management for DRY principle:
```typescript
export class RedisManager {
  async ensureRedis(port: number, containerName: string): Promise<void> {
    if (!await this.isDockerAvailable()) {
      throw new Error(`Docker required. Install Docker or run: brew install redis && redis-server`)
    }
    await this.startOrReuse(port, containerName)
    await this.waitForConnection(port)
  }
  
  async cleanup(containerName: string): Promise<void> {
    // Stop and remove container with error handling
  }
}
```

### 2.2 Update scripts/dev.ts
Use shared Redis manager:
- Use RedisManager to ensure redis-quickdapp-dev on port 6379
- Verify connection before starting servers
- Clean shutdown handling

### 2.3 Update scripts/test.ts
Use shared Redis manager with strict isolation:
- Check port 6380 availability (error if in use, not fallback)
- Use RedisManager to start redis-quickdapp-test container
- Guaranteed cleanup in finally block (even on failure/SIGINT)
- Stop and remove container after tests

## Phase 3: Database Schema Update

### 3.1 Update src/server/db/schema.ts
Simplified audit-only schema (active jobs handled by Redis):
```typescript
export const workerJobs = pgTable("worker_jobs", {
  id: serial("id").primaryKey(),
  
  // Essential job identification
  jobId: text("job_id").notNull().unique(),
  type: text("type").notNull(),
  userId: integer("user_id"), // NULLABLE for system jobs (watchChain, etc.)
  
  // Job data and results
  data: json("data").notNull(),
  result: json("result"),
  error: text("error"),
  
  // Execution metrics
  status: text("status").notNull(), // completed, failed
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Optimized indexes for common queries
const workerJobsIndexes = [
  index("idx_worker_jobs_type").on(workerJobs.type),
  index("idx_worker_jobs_status").on(workerJobs.status), 
  index("idx_worker_jobs_created").on(workerJobs.createdAt),
]
```

### 3.2 Create migration
- Modify worker_jobs table structure
- Add new columns for audit purposes
- Create indexes for efficient querying

## Phase 4: Core Queue Infrastructure

### 4.1 Create src/server/queue/redis.ts
- Redis connection factory with retry logic
- Support for database selection (dev=0, test=1)
- Health check functionality

### 4.2 Create src/server/queue/queues.ts
Simplified single queue with priority-based routing:
```typescript
export const jobQueue = new Queue('jobs', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    // Smart defaults with exponential backoff
    attempts: serverConfig.WORKER_QUEUE_JOB_ATTEMPTS,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600, count: 100 }, // Keep recent history
    removeOnFail: { age: 86400, count: 500 },    // Keep failures longer
  }
})

// Priority mapping for different job types
export const getJobPriority = (jobType: JobType): number => {
  switch (jobType) {
    case 'watchChain': return 10      // High priority (time-sensitive)
    case 'deployMulticall3': return 5 // Medium priority
    case 'cleanupAuditLog': return 1  // Low priority (maintenance)
    default: return 5
  }
}
```

### 4.3 Create src/shared/queue/types.ts
Simplified discriminated union approach:
```typescript
// Type-safe job definitions using discriminated unions
export type Job = 
  | { type: 'watchChain'; data: { fromBlock?: bigint } }
  | { type: 'deployMulticall3'; data: { forceRedeploy?: boolean } }
  | { type: 'cleanupAuditLog'; data: { retentionDays: number } }

export type JobType = Job['type']

// Automatic type inference for job data
export type JobData<T extends JobType> = Extract<Job, { type: T }>['data']
```

## Phase 5: Queue Manager Implementation

### 5.1 Create src/server/queue/manager.ts
Simplified QueueManager with single queue and priority routing:
```typescript
export class QueueManager {
  async submitJob<T extends JobType>(
    type: T, 
    data: JobData<T>, 
    userId?: number,
    options?: JobOptions
  ) {
    const priority = getJobPriority(type)
    const job = await jobQueue.add(type, { userId, data }, {
      priority,
      ...options
    })
    return job.id!
  }

  async scheduleCronJob<T extends JobType>(
    type: T,
    pattern: string,
    data: JobData<T>,
    repeatJobKey: string
  ) {
    const priority = getJobPriority(type)
    await jobQueue.add(type, { userId: null, data }, {
      repeat: { pattern },
      repeatJobKey,
      priority
    })
  }

  async removeCronJob(repeatJobKey: string) {
    await jobQueue.removeRepeatable(repeatJobKey)
  }

  async getHealth() {
    return {
      waiting: await jobQueue.getWaiting(),
      active: await jobQueue.getActive(),
      completed: await jobQueue.getCompleted(),
      failed: await jobQueue.getFailed(),
    }
  }
}
```

### 5.2 Update ServerApp type
- Replace workerManager with queueManager
- Add queue health check methods

## Phase 6: Worker Implementation

### 6.1 Create src/server/queue/processor.ts
Unified job processor with cross-cutting concerns:
```typescript
import { jobRegistry } from '../workers/jobs/registry'

export const createProcessor = (serverApp: ServerApp) => async (job: BullMQJob) => {
  const handler = jobRegistry[job.name as JobType]
  if (!handler) throw new Error(`Unknown job: ${job.name}`)
  
  const logger = serverApp.createLogger(`job-${job.name}`)
  const start = Date.now()
  
  try {
    const result = await handler.run({
      serverApp,
      log: logger,
      job: { 
        id: job.id!, 
        type: job.name as JobType, 
        userId: job.data.userId,
        data: job.data.data 
      }
    })
    
    // Record successful execution in audit log
    await recordJobExecution(serverApp, {
      jobId: job.id!,
      type: job.name,
      userId: job.data.userId,
      data: job.data.data,
      result,
      status: 'completed',
      startedAt: new Date(job.processedOn!),
      completedAt: new Date(),
      durationMs: Date.now() - start,
    })
    
    return result
  } catch (error) {
    await recordJobExecution(serverApp, {
      jobId: job.id!,
      type: job.name,
      userId: job.data.userId,
      data: job.data.data,
      error: error.message,
      status: 'failed',
      startedAt: new Date(job.processedOn!),
      completedAt: new Date(),
      durationMs: Date.now() - start,
    })
    throw error
  }
}
```

### 6.2 Update src/server/workers/index.ts
Hybrid architecture: Keep subprocesses + BullMQ concurrency:
```typescript
export const createWorkerManager = async (serverApp: ServerApp) => {
  const workerCount = serverConfig.WORKER_COUNT === "cpus" 
    ? os.cpus().length 
    : serverConfig.WORKER_COUNT

  // Keep multi-process architecture for CPU isolation
  for (let i = 0; i < workerCount; i++) {
    const worker = new WorkerProcess(i + 1, serverApp)
    worker.start() // Each process creates BullMQ Worker internally
    workers.push(worker)
  }
  
  return queueManager // Return QueueManager instead of WorkerManager
}

// In each worker subprocess:
const worker = new Worker('jobs', createProcessor(serverApp), {
  connection: createRedisConnection(),
  concurrency: serverConfig.WORKER_QUEUE_CONCURRENCY,
  stalledInterval: serverConfig.WORKER_QUEUE_STALLED_INTERVAL,
})
```

### 6.3 Keep separate job handler files
Maintain existing structure for better organization:
```
src/server/workers/jobs/
├── watchChain.ts        # Keep existing blockchain monitoring
├── deployMulticall3.ts  # Keep existing contract deployment  
├── cleanupAuditLog.ts   # New: Clean old audit records (optional)
├── registry.ts          # Updated job registry (remove removeOldWorkerJobs)
└── types.ts            # Existing types
```

## Phase 7: Audit System

### 7.1 Create src/server/db/worker-audit.ts
- recordJobExecution - Log job results to database
- getJobHistory - Query historical executions
- getJobMetrics - Calculate success rates, durations

## Phase 8: Cleanup Old Code

### 8.1 Delete old worker queue code
- Remove src/server/db/worker.ts
- Remove database polling logic from workers
- Remove manual cron rescheduling

### 8.2 Add Queue Monitoring & Metrics

#### BullMQ Dashboard (Bull Board)
```bash
bun add @bull-board/api @bull-board/bullmq @bull-board/elysia
```

```typescript
// Integrate Bull Board dashboard at /admin/queues
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ElysiaAdapter } from '@bull-board/elysia'

const serverAdapter = new ElysiaAdapter('/admin/queues')
createBullBoard({
  queues: [new BullMQAdapter(jobQueue)],
  serverAdapter,
  options: {
    uiConfig: {
      boardTitle: 'QuickDapp Job Queue',
      miscLinks: [{ text: 'Docs', url: '/docs' }]
    }
  }
})
```

#### Prometheus Metrics (Optional)
```bash
bun add prom-client
```

```typescript
// Add /metrics endpoint for monitoring
const jobDurationHistogram = new client.Histogram({
  name: 'bullmq_job_duration_seconds',
  help: 'Job processing duration in seconds',
  labelNames: ['job_type', 'queue', 'status']
})

const jobCounter = new client.Counter({
  name: 'bullmq_jobs_total', 
  help: 'Total number of jobs processed',
  labelNames: ['job_type', 'queue', 'status']
})

// Export metrics at /metrics endpoint
app.get('/metrics', () => register.metrics())
```

**Benefits:**
- Real-time queue monitoring at `/admin/queues`
- Job retry/pause/resume capabilities
- Prometheus metrics for alerting/dashboards
- No additional infrastructure required

## Phase 9: Comprehensive Test Suite

**Test Organization**: Move all queue-related tests to `tests/server/queue/` (replacing `tests/server/workers/`)

### 9.1 Create tests/server/queue/queue.test.ts
**Test Queue Basics:**
- Job submission and processing
- Priority queue ordering
- Job delays and scheduling
- Concurrent job processing

### 9.2 Create tests/server/queue/cron.test.ts
**Test Cron Jobs:**
- Cron pattern parsing and scheduling
- Deduplication with repeatJobKey
- Schedule updates and removal
- Convention-based job registration

### 9.3 Create tests/server/queue/resilience.test.ts
**Test Failure Scenarios:**
- Job retry with exponential backoff
- Stalled job detection and recovery
- Process crash during job execution
- Redis connection loss and reconnection

### 9.4 Create tests/server/queue/audit.test.ts
**Test Audit Logging:**
- Successful job execution recording
- Failed job recording with error details
- Job history queries with filters
- Job performance metrics calculation

### 9.5 Create tests/server/queue/blockchain.test.ts
**Test Blockchain Worker Integration:**
- watchChain job processing with BullMQ
- Event processing and filtering
- Filter recreation on blockchain errors
- Priority handling for time-sensitive jobs

### 9.6 Create tests/server/queue/manager.test.ts
**Test QueueManager:**
- Type-safe job submission
- Priority-based job routing
- Cron job lifecycle management
- Health check functionality

### 9.7 Update tests/helpers/queue.ts (renamed from worker.ts)
Simplified helpers for single queue architecture:
```typescript
export async function waitForJob(jobId: string, timeout = 5000) {
  const job = await jobQueue.getJob(jobId)
  if (!job) throw new Error(`Job ${jobId} not found`)
  
  const events = new QueueEvents('jobs', { connection })
  return await job.waitUntilFinished(events, timeout)
}

export async function cleanQueue() {
  // Single queue cleanup
  await jobQueue.obliterate({ force: true })
}

export async function submitTestJob<T extends JobType>(
  type: T, 
  data: JobData<T>, 
  options?: JobOptions
) {
  const priority = getJobPriority(type)
  return jobQueue.add(type, { userId: null, data }, { priority, ...options })
}
```

### 9.8 Update tests/helpers/database.ts
```typescript
export async function cleanWorkerAudit(db: PostgresJsDatabase) {
  await db.delete(workerJobs)
}

export async function createTestJobAudit(db: PostgresJsDatabase, data: Partial<WorkerJob>) {
  return db.insert(workerJobs).values({
    jobId: data.jobId || 'test-job-1',
    type: data.type || 'testJob',
    userId: data.userId || null,
    data: data.data || {},
    status: data.status || 'completed',
    queueName: data.queueName || 'test',
    workerId: data.workerId || 1,
    attempts: data.attempts || 1,
    queuedAt: data.queuedAt || new Date(),
    startedAt: data.startedAt || new Date(),
    completedAt: data.completedAt || new Date(),
    durationMs: data.durationMs || 100,
  }).returning()
}
```

### 9.9 Test Environment Setup
```typescript
// tests/setup.ts
import { spawn } from 'bun'

let redisProcess: any

beforeAll(async () => {
  // Start test Redis
  redisProcess = spawn(['docker', 'run', '-d', '--name', 'redis-test', '-p', '6380:6379', 'redis:alpine'])
  await new Promise(r => setTimeout(r, 1000)) // Wait for Redis to start
})

afterAll(async () => {
  // Cleanup test Redis
  await spawn(['docker', 'stop', 'redis-test']).exited
  await spawn(['docker', 'rm', 'redis-test']).exited
})
```

## Phase 10: Default Jobs Setup

### 10.1 Create src/server/queue/setup-default-jobs.ts
Convention-based cron job registration:
```typescript
// Smart defaults with automatic registration
const cronJobs = {
  watchChain: { 
    pattern: '*/3 * * * * *',  // Every 3 seconds
    data: {},
    key: 'watch-chain'
  },
  cleanupAuditLog: { 
    pattern: '0 3 * * *',      // Daily at 3 AM
    data: { retentionDays: serverConfig.AUDIT_LOG_RETENTION_DAYS || 30 },
    key: 'cleanup-audit-log',
    enabled: serverConfig.AUDIT_LOG_RETENTION_DAYS > 0
  },
} as const

export async function setupDefaultJobs(queueManager: QueueManager) {
  for (const [jobType, config] of Object.entries(cronJobs)) {
    if ('enabled' in config && !config.enabled) continue
    
    await queueManager.scheduleCronJob(
      jobType as JobType,
      config.pattern,
      config.data,
      config.key
    )
  }
}
```

## Implementation Order

1. **Environment Setup** - Add Redis configuration
2. **Scripts** - Update dev.ts and test.ts with Redis management
3. **Database** - Modify schema and create migration
4. **Queue Core** - Implement Redis connection and queues
5. **Queue Manager** - Create manager to replace WorkerManager
6. **Workers** - Implement BullMQ workers
7. **Audit System** - Add job execution logging
8. **Tests** - Comprehensive test suite
9. **Cleanup** - Remove old database queue code
10. **Deploy** - Test in development environment

## Key Benefits

### Performance Improvements
- **No Database Polling**: Redis push-based job delivery eliminates 1-second polling loops
- **Hybrid Concurrency**: Process-level CPU isolation + event-loop I/O parallelism
- **Atomic Job Distribution**: Redis ensures no lock contention between workers
- **Priority Queue**: Time-sensitive jobs (watchChain) processed before maintenance tasks

### Reliability Enhancements  
- **Automatic Retry**: Exponential backoff with configurable attempts
- **Stalled Job Recovery**: Automatic detection and retry of crashed job processing
- **Process Isolation**: Worker crash doesn't affect other workers or main server
- **Guaranteed Cleanup**: Test Redis isolated on separate port with mandatory teardown

### Observability & Maintainability
- **Complete Audit Trail**: All job executions logged to database for analytics
- **Type-Safe Jobs**: Discriminated unions provide compile-time job validation
- **Simplified Architecture**: Single queue with priority routing vs multiple queues
- **Smart Defaults**: Minimal configuration required, works out-of-box
- **Better Testing**: Dedicated test organization in tests/server/queue/

## Simplifications Applied

### Reduced Complexity (~40% code reduction)
1. **Single Queue**: Priority-based routing instead of multiple queues (maintenance, blockchain, critical)
2. **Fewer Environment Variables**: 4 essential vars with smart defaults instead of 8+ 
3. **Unified Job Processor**: Single processor handles all cross-cutting concerns (logging, metrics, audit)
4. **Shared Redis Management**: DRY principle for container startup/cleanup in dev and test scripts
5. **Simplified Schema**: Essential audit fields only (10 columns vs 15+)

### Enhanced Developer Experience
1. **Redis Required Everywhere**: Consistent behavior across dev/test/prod environments
2. **Type-Safe Jobs**: Discriminated unions for automatic TypeScript inference
3. **Convention over Configuration**: Auto-register cron jobs, smart defaults
4. **Better Test Organization**: All queue tests in tests/server/queue/ directory
5. **Separate Handler Files**: Maintain clean separation of business logic per job type

## Implementation Notes

- **Hybrid Concurrency**: Preserves existing multi-process architecture + adds BullMQ event-loop concurrency
- **System Jobs**: `userId` is NULLABLE for system jobs (watchChain, deployMulticall3, cleanupAuditLog)  
- **No More Database Cleanup**: `removeOldWorkerJobs` eliminated - BullMQ handles Redis cleanup automatically
- **Test Isolation**: Separate Redis instance on port 6380 with guaranteed teardown
- **Audit vs Active**: Database stores execution history, Redis handles active job processing
- **Graceful Migration**: Can implement incrementally while keeping existing system running

This hybrid architecture provides the CPU isolation benefits of multi-process workers with the I/O efficiency of BullMQ's event-loop concurrency, while significantly simplifying the codebase and improving developer experience.