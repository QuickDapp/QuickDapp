import { type ChildProcess } from "node:child_process"
import { type Job as BullMQJob, QueueEvents } from "bullmq"
import { and, desc, eq } from "drizzle-orm"
import { createTestRedisManager } from "../../scripts/shared/redis-manager"
import { workerJobs } from "../../src/server/db/schema"
import { jobQueue, queueEvents } from "../../src/server/queue/queues"
import {
  getSharedRedisConnection,
  shutdownSharedRedis,
} from "../../src/server/queue/redis"
import type { JobData, JobType } from "../../src/server/queue/types"
import type { ServerApp } from "../../src/server/types"
import { testLogger } from "./logger"

// Test Redis manager for cleanup
const _testRedisManager = createTestRedisManager(false)

// Global registry of all spawned worker processes
const activeWorkerProcesses = new Set<ChildProcess>()

/**
 * Kills all active worker processes - used for cleanup on test exit
 */
export const killAllActiveWorkers = (): void => {
  if (activeWorkerProcesses.size === 0) {
    return
  }

  testLogger.info(
    `🧹 Cleaning up ${activeWorkerProcesses.size} active worker processes...`,
  )

  for (const process of activeWorkerProcesses) {
    try {
      if (!process.killed) {
        process.kill("SIGKILL")
        testLogger.debug(`Killed worker process ${process.pid}`)
      }
    } catch (error) {
      testLogger.warn(`Failed to kill worker process ${process.pid}:`, error)
    }
  }

  activeWorkerProcesses.clear()
  testLogger.info("✅ All worker processes cleaned up")
}

/**
 * Shutdown handler for process exit signals
 */
const handleShutdown = (signal: string) => {
  testLogger.info(`🛑 Test process received ${signal}, cleaning up workers...`)
  killAllActiveWorkers()
  process.exit(0)
}

// Register shutdown handlers for cleanup
process.on("SIGINT", () => handleShutdown("SIGINT"))
process.on("SIGTERM", () => handleShutdown("SIGTERM"))

/**
 * Submit a job and get the BullMQ job instance
 */
export async function submitTestJob<T extends JobType>(
  type: T,
  data: JobData<T>,
  userId?: number | null,
  options?: { delay?: number; priority?: number },
): Promise<BullMQJob> {
  const job = await jobQueue.add(
    type,
    {
      userId: userId ?? null,
      data,
    },
    {
      priority: options?.priority ?? 5,
      delay: options?.delay,
      // Add test markers to make jobs identifiable
      jobId: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
  )

  if (!job.id) {
    throw new Error(`Failed to submit test job of type: ${type}`)
  }

  return job
}

/**
 * Wait for a specific job to complete by job ID
 */
export async function waitForJob(
  jobId: string,
  timeoutMs = 10000,
): Promise<any> {
  const job = await jobQueue.getJob(jobId)
  if (!job) {
    throw new Error(`Job ${jobId} not found`)
  }

  const events = new QueueEvents("jobs", {
    connection: getSharedRedisConnection(),
  })

  try {
    return await job.waitUntilFinished(events, timeoutMs)
  } finally {
    await events.close()
  }
}

/**
 * Wait for job audit record to appear in database
 */
export async function waitForJobAudit(
  serverApp: ServerApp,
  jobId: string,
  timeoutMs = 10000,
): Promise<any> {
  const startTime = Date.now()
  const pollInterval = 100

  while (Date.now() - startTime < timeoutMs) {
    const auditRecord = await serverApp.db
      .select()
      .from(workerJobs)
      .where(eq(workerJobs.jobId, jobId))
      .limit(1)

    if (auditRecord.length > 0) {
      return auditRecord[0]
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval))
  }

  throw new Error(
    `Job audit record for ${jobId} not found within ${timeoutMs}ms`,
  )
}

/**
 * Submit job and wait for both completion and audit record
 */
export async function submitJobAndWaitForCompletion<T extends JobType>(
  serverApp: ServerApp,
  type: T,
  data: JobData<T>,
  userId?: number | null,
  options: {
    timeoutMs?: number
    delay?: number
    priority?: number
  } = {},
) {
  const { timeoutMs = 15000, delay, priority } = options

  testLogger.debug(`Submitting test job: ${type}`)

  // Submit the job
  const job = await submitTestJob(type, data, userId, { delay, priority })

  testLogger.debug(`Job submitted with ID: ${job.id}`)

  // Wait for job completion
  const result = await waitForJob(job.id!, timeoutMs)

  testLogger.debug(`Job ${job.id} completed with result:`, result)

  // Wait for audit record
  const auditRecord = await waitForJobAudit(serverApp, job.id!, 5000)

  testLogger.debug(`Job ${job.id} audit record created`)

  return {
    job,
    result,
    auditRecord,
  }
}

/**
 * Clean the job queue (remove all jobs)
 */
export async function cleanJobQueue(): Promise<void> {
  try {
    testLogger.debug("Cleaning job queue...")

    // Clean all job types
    await jobQueue.clean(0, 0, "completed")
    await jobQueue.clean(0, 0, "failed")
    await jobQueue.clean(0, 0, "active")
    await jobQueue.clean(0, 0, "waiting")
    await jobQueue.clean(0, 0, "delayed")

    // Remove all repeatable jobs
    const repeatableJobs = await jobQueue.getRepeatableJobs()
    for (const job of repeatableJobs) {
      await jobQueue.removeRepeatableByKey(job.key)
    }

    testLogger.debug("Job queue cleaned")
  } catch (error) {
    testLogger.warn("Error cleaning job queue:", error)
  }
}

/**
 * Clean job audit records from database
 */
export async function cleanJobAudit(serverApp: ServerApp): Promise<void> {
  try {
    testLogger.debug("Cleaning job audit records...")
    await serverApp.db.delete(workerJobs)
    testLogger.debug("Job audit records cleaned")
  } catch (error) {
    testLogger.warn("Error cleaning job audit:", error)
  }
}

/**
 * Get queue health/status
 */
export async function getQueueStatus() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    jobQueue.getWaiting(),
    jobQueue.getActive(),
    jobQueue.getCompleted(),
    jobQueue.getFailed(),
    jobQueue.getDelayed(),
  ])

  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
    delayed: delayed.length,
    total:
      waiting.length +
      active.length +
      completed.length +
      failed.length +
      delayed.length,
  }
}

/**
 * Find job audit records by criteria
 */
export async function findJobAuditRecords(
  serverApp: ServerApp,
  criteria: {
    type?: string
    status?: "completed" | "failed"
    userId?: number
  } = {},
) {
  const conditions = []

  if (criteria.type) {
    conditions.push(eq(workerJobs.type, criteria.type))
  }

  if (criteria.status) {
    conditions.push(eq(workerJobs.status, criteria.status))
  }

  if (criteria.userId !== undefined) {
    conditions.push(eq(workerJobs.userId, criteria.userId))
  }

  const baseQuery = serverApp.db.select().from(workerJobs)

  if (conditions.length > 0) {
    return await baseQuery
      .where(and(...conditions))
      .orderBy(desc(workerJobs.createdAt))
  }

  return await baseQuery.orderBy(desc(workerJobs.createdAt))
}

/**
 * Wait for all jobs in queue to be processed
 */
export async function waitForQueueEmpty(timeoutMs = 30000): Promise<void> {
  const startTime = Date.now()
  const pollInterval = 500

  while (Date.now() - startTime < timeoutMs) {
    const status = await getQueueStatus()

    if (status.waiting === 0 && status.active === 0 && status.delayed === 0) {
      testLogger.debug("Queue is empty")
      return
    }

    testLogger.debug(
      `Queue status: ${status.waiting} waiting, ${status.active} active, ${status.delayed} delayed`,
    )
    await new Promise((resolve) => setTimeout(resolve, pollInterval))
  }

  const status = await getQueueStatus()
  throw new Error(
    `Queue not empty after ${timeoutMs}ms. Status: ${JSON.stringify(status)}`,
  )
}

/**
 * Setup test queue state (Redis is managed by test runner)
 */
export async function setupTestQueue(): Promise<void> {
  testLogger.debug("Setting up test queue...")

  // Redis is already managed by the test runner
  // Just clean the queue state
  await cleanJobQueue()

  testLogger.debug("Test queue setup complete")
}

/**
 * Cleanup test queue state (Redis is managed by test runner)
 */
export async function teardownTestQueue(serverApp: ServerApp): Promise<void> {
  testLogger.debug("Tearing down test queue...")

  try {
    // Clean queue and audit
    await cleanJobQueue()
    await cleanJobAudit(serverApp)

    // Close queue connections
    await jobQueue.close()
    await queueEvents.close()

    // Close shared Redis connection
    await shutdownSharedRedis()
  } catch (error) {
    testLogger.warn("Error during queue teardown:", error)
  }

  // Redis cleanup is handled by the test runner
  testLogger.debug("Test queue teardown complete")
}

/**
 * Create a test job config with unique identifiers
 */
export function createTestJobData(baseData: any = {}) {
  return {
    testRun: true,
    testId: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...baseData,
  }
}
