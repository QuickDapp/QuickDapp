import "./test-config"

import { type ChildProcess, fork } from "node:child_process"
import path from "node:path"
import { and, desc, eq, isNotNull } from "drizzle-orm"
import { type WorkerJob, workerJobs } from "../../src/server/db/schema"
import {
  getJobById,
  getTotalPendingJobs,
  scheduleCronJob,
  scheduleJob,
} from "../../src/server/db/worker"
import type { ServerApp } from "../../src/server/types"
import { testLogger } from "./logger"
import { getTestDatabaseUrl, getTestFileIndex } from "./test-config"

const activeWorkerProcesses = new Set<ChildProcess>()

export interface TestWorkerContext {
  process: ChildProcess | null
  isRunning: boolean
  workerId: number
}

/**
 * Creates and starts a test worker by spawning the actual worker process
 */
export const startTestWorker = async (
  workerId: number = 1,
): Promise<TestWorkerContext> => {
  const context: TestWorkerContext = {
    process: null,
    isRunning: false,
    workerId,
  }

  const serverIndexPath = path.join(__dirname, "../../src/server/index.ts")

  const testIndex = getTestFileIndex()
  const uniqueWorkerId = testIndex * 100 + workerId

  context.process = fork(serverIndexPath, [], {
    env: {
      ...process.env,
      NODE_ENV: "test",
      WORKER_ID: uniqueWorkerId.toString(),
      DATABASE_URL: getTestDatabaseUrl(),
    },
    silent: false,
  })

  if (!context.process) {
    throw new Error("Failed to spawn worker process")
  }

  activeWorkerProcesses.add(context.process)

  context.process.on("message", (message) => {
    testLogger.info(`Worker ${context.workerId} message:`, message)
  })

  context.process.on("error", (error) => {
    testLogger.error(`Worker ${context.workerId} error:`, error.message)
  })

  context.process.on("exit", (code, signal) => {
    testLogger.info(
      `Worker ${context.workerId} exited with code ${code}, signal ${signal}`,
    )
    context.isRunning = false
    if (context.process) {
      activeWorkerProcesses.delete(context.process)
    }
  })

  const startupPromise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Worker ${context.workerId} startup timeout`))
    }, 10000)

    const messageHandler = (message: any) => {
      if (message.type === "worker-started") {
        clearTimeout(timeout)
        context.process?.off("message", messageHandler)
        resolve()
      }
    }

    context.process?.on("message", messageHandler)
  })

  context.isRunning = true

  try {
    await startupPromise
    testLogger.info(`✅ Test worker ${context.workerId} started successfully`)
  } catch (error) {
    context.isRunning = false
    if (context.process) {
      activeWorkerProcesses.delete(context.process)
      context.process.kill("SIGKILL")
      context.process = null
    }
    throw error
  }

  return context
}

/**
 * Stops the test worker
 */
export const stopTestWorker = async (
  context: TestWorkerContext,
): Promise<void> => {
  if (!context || !context.isRunning || !context.process) {
    testLogger.warn("⚠️  Worker context is invalid or already stopped")
    return
  }

  testLogger.info(`🛑 Stopping test worker ${context.workerId}...`)

  context.process.kill("SIGTERM")

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      testLogger.warn(`⚠️ Worker ${context.workerId} force killing...`)
      if (context.process && !context.process.killed) {
        context.process.kill("SIGKILL")
      }
      resolve()
    }, 5000)

    context.process?.on("exit", () => {
      clearTimeout(timeout)
      resolve()
    })
  })

  if (context.process) {
    activeWorkerProcesses.delete(context.process)
  }
  context.process = null
  context.isRunning = false
  testLogger.info(`✅ Test worker ${context.workerId} stopped`)
}

/**
 * Submits a job and waits for it to complete
 */
export const submitJobAndWait = async (
  serverApp: ServerApp,
  jobConfig: {
    tag: string
    type: string
    userId: number
    data?: any
    autoRescheduleOnFailure?: boolean
    autoRescheduleOnFailureDelay?: number
  },
  options: {
    timeoutMs?: number
    pollIntervalMs?: number
  } = {},
): Promise<WorkerJob> => {
  const job = await scheduleJob(serverApp, jobConfig)
  return waitForJobCompletion(serverApp, job.id, options)
}

/**
 * Submits a cron job and waits for the first execution
 */
export const submitCronJobAndWait = async (
  serverApp: ServerApp,
  jobConfig: {
    tag: string
    type: string
    userId: number
    data?: any
    autoRescheduleOnFailure?: boolean
    autoRescheduleOnFailureDelay?: number
  },
  cronSchedule: string,
  options: {
    timeoutMs?: number
    pollIntervalMs?: number
  } = {},
): Promise<WorkerJob> => {
  const { timeoutMs = 10000, pollIntervalMs = 100 } = options

  const job = await scheduleCronJob(serverApp, jobConfig, cronSchedule)
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const currentJob = await getJobById(serverApp, job.id)

    if (!currentJob) {
      throw new Error(`Cron job ${job.id} not found`)
    }

    if (currentJob.finished) {
      return currentJob
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  throw new Error(`Cron job ${job.id} did not complete within ${timeoutMs}ms`)
}

/**
 * Waits for all pending jobs to be processed
 */
export const waitForAllJobsToComplete = async (
  serverApp: ServerApp,
  options: {
    timeoutMs?: number
    pollIntervalMs?: number
  } = {},
): Promise<void> => {
  const { timeoutMs = 30000, pollIntervalMs = 500 } = options

  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const pendingCount = await getTotalPendingJobs(serverApp)

    if (pendingCount === 0) {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  const remainingJobs = await getTotalPendingJobs(serverApp)
  throw new Error(`${remainingJobs} jobs still pending after ${timeoutMs}ms`)
}

/**
 * Helper to wait for a specific job to complete by ID
 */
export const waitForJobCompletion = async (
  serverApp: ServerApp,
  jobId: number,
  options: {
    timeoutMs?: number
    pollIntervalMs?: number
  } = {},
): Promise<WorkerJob> => {
  const { timeoutMs = 10000, pollIntervalMs = 100 } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const job = await getJobById(serverApp, jobId)

    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    if (job.finished) {
      return job
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  throw new Error(`Job ${jobId} did not complete within ${timeoutMs}ms`)
}

/**
 * More robust helper to wait for a test job completion by matching criteria
 */
export const waitForTestJobCompletion = async (
  serverApp: ServerApp,
  criteria: {
    type: string
    userId: number
    data?: any
  },
  options: {
    timeoutMs?: number
    pollIntervalMs?: number
  } = {},
): Promise<WorkerJob> => {
  const { timeoutMs = 10000, pollIntervalMs = 100 } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const matchingJobs = await serverApp.db
      .select()
      .from(workerJobs)
      .where(
        and(
          eq(workerJobs.type, criteria.type),
          eq(workerJobs.userId, criteria.userId),
          isNotNull(workerJobs.finished),
        ),
      )
      .orderBy(desc(workerJobs.createdAt))

    const testJob = matchingJobs.find((job) => {
      if (!criteria.data) return true
      return JSON.stringify(job.data) === JSON.stringify(criteria.data)
    })

    if (testJob) {
      return testJob
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  throw new Error(
    `Test job matching criteria did not complete within ${timeoutMs}ms`,
  )
}

/**
 * Creates a test job configuration with unique test markers
 */
export const createTestJobConfig = (
  overrides: Partial<{
    tag: string
    type: string
    userId: number
    data: any
    autoRescheduleOnFailure: boolean
    autoRescheduleOnFailureDelay: number
  }> = {},
) => {
  const testId = `test-${Date.now()}-${Math.random()}`
  const baseData = {
    testRun: true,
    testId,
    ...(overrides.data || {}),
  }

  return {
    tag: overrides.tag || `test:${testId}`,
    type: "removeOldWorkerJobs",
    userId: 9999,
    autoRescheduleOnFailure: false,
    autoRescheduleOnFailureDelay: 0,
    ...overrides,
    data: baseData,
  }
}

/**
 * Submits a test job and waits for completion using robust criteria matching
 */
export const submitTestJobAndWait = async (
  serverApp: ServerApp,
  jobConfig: {
    tag?: string
    type: string
    userId?: number
    data?: any
    autoRescheduleOnFailure?: boolean
    autoRescheduleOnFailureDelay?: number
  },
  options: {
    timeoutMs?: number
    pollIntervalMs?: number
  } = {},
): Promise<WorkerJob> => {
  const testJobConfig = createTestJobConfig(jobConfig)
  await scheduleJob(serverApp, testJobConfig)

  return waitForTestJobCompletion(
    serverApp,
    {
      type: testJobConfig.type,
      userId: testJobConfig.userId,
      data: testJobConfig.data,
    },
    options,
  )
}

/**
 * Counts jobs by status
 */
export const countJobsByStatus = async (
  serverApp: ServerApp,
): Promise<{
  pending: number
  total: number
}> => {
  const pendingCount = await getTotalPendingJobs(serverApp)

  return {
    pending: pendingCount,
    total: pendingCount,
  }
}

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

const handleShutdown = (signal: string) => {
  testLogger.info(`🛑 Test process received ${signal}, cleaning up workers...`)
  killAllActiveWorkers()
  process.exit(0)
}

process.on("SIGINT", () => handleShutdown("SIGINT"))
process.on("SIGTERM", () => handleShutdown("SIGTERM"))
