import os from "node:os"
import { Worker } from "bullmq"
import { serverConfig } from "../../shared/config/server"
import type { Logger } from "../lib/logger"
import { LOG_CATEGORIES } from "../lib/logger"
import type { ServerApp } from "../types"
import { QueueManager } from "./manager"
import { createProcessor } from "./processor"
import { getSharedRedisConnection } from "./redis"

class WorkerProcess {
  private bullMQWorker: Worker | null = null
  private isShuttingDown = false
  private logger: Logger

  constructor(
    private workerId: number,
    private serverApp: ServerApp,
  ) {
    this.logger = serverApp.createLogger(`${LOG_CATEGORIES.WORKER}-${workerId}`)
  }

  start(): void {
    this.logger.debug(`Starting BullMQ worker ${this.workerId}`)

    // Create BullMQ worker instance
    this.bullMQWorker = new Worker("jobs", createProcessor(this.serverApp), {
      connection: getSharedRedisConnection(),
      concurrency: serverConfig.WORKER_QUEUE_CONCURRENCY,
      stalledInterval: serverConfig.WORKER_QUEUE_STALLED_INTERVAL,
      maxStalledCount: 1,
    })

    // Worker event handlers
    this.bullMQWorker.on("ready", () => {
      this.logger.info(`BullMQ worker ${this.workerId} ready`)
    })

    this.bullMQWorker.on("active", (job) => {
      this.logger.debug(
        `Worker ${this.workerId} processing job ${job.id} (${job.name})`,
      )
    })

    this.bullMQWorker.on("completed", (job) => {
      this.logger.debug(
        `Worker ${this.workerId} completed job ${job.id} (${job.name})`,
      )
    })

    this.bullMQWorker.on("failed", (job, err) => {
      this.logger.error(
        `Worker ${this.workerId} failed job ${job?.id} (${job?.name}):`,
        err.message,
      )
    })

    this.bullMQWorker.on("error", (error) => {
      this.logger.error(`Worker ${this.workerId} error:`, error)
    })

    this.bullMQWorker.on("stalled", (jobId) => {
      this.logger.warn(`Worker ${this.workerId} stalled job ${jobId}`)
    })

    this.logger.info(`BullMQ worker ${this.workerId} started`)
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true
    if (this.bullMQWorker) {
      this.logger.debug(`Shutting down BullMQ worker ${this.workerId}`)

      try {
        // Close the worker gracefully
        await this.bullMQWorker.close()
        this.logger.info(`BullMQ worker ${this.workerId} shut down gracefully`)
      } catch (error) {
        this.logger.error(
          `Error shutting down BullMQ worker ${this.workerId}:`,
          error,
        )
      }
    }
  }
}

export const createQueueManager = async (
  serverApp: ServerApp,
  workerCountOverride?: number,
): Promise<QueueManager> => {
  const logger = serverApp.createLogger(LOG_CATEGORIES.WORKER_MANAGER)
  const workerCount =
    workerCountOverride ??
    (serverConfig.WORKER_COUNT === "cpus"
      ? os.cpus().length
      : serverConfig.WORKER_COUNT)

  const workers: WorkerProcess[] = []

  // Initialize BullMQ workers (hybrid approach: multiple processes with BullMQ concurrency)
  for (let i = 0; i < workerCount; i++) {
    const worker = new WorkerProcess(i + 1, serverApp)
    worker.start()
    workers.push(worker)
  }

  logger.info(`Initialized ${workerCount} BullMQ worker processes`)

  // Create QueueManager instance
  const queueManager = new QueueManager()

  // Set up default cron jobs
  await setupDefaultJobs(queueManager, logger)

  // Schedule Multicall3 deployment immediately on startup
  logger.info("Scheduling Multicall3 deployment check...")
  await queueManager.submitJob("deployMulticall3", { forceRedeploy: false })

  // Add shutdown method to queue manager
  const originalShutdown = queueManager.shutdown.bind(queueManager)
  queueManager.shutdown = async () => {
    logger.info("Shutting down all workers and queue...")
    await Promise.all(workers.map((worker) => worker.shutdown()))
    await originalShutdown()
    logger.info("All workers and queue shut down")
  }

  return queueManager
}

async function setupDefaultJobs(queueManager: QueueManager, logger: Logger) {
  logger.info("Setting up default cron jobs...")

  // Set up recurring jobs
  await queueManager.scheduleCronJob(
    "watchChain",
    "*/30 * * * * *", // Every 30 seconds
    {},
    "watch-chain",
  )

  await queueManager.scheduleCronJob(
    "cleanupAuditLog",
    "0 3 * * *", // Daily at 3 AM
    { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days in milliseconds
    "cleanup-audit-log",
  )

  logger.info("Default cron jobs scheduled successfully")
}
