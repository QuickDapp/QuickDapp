import { Queue, QueueEvents } from "bullmq"
import { serverConfig } from "../../shared/config/server"
import type { Logger } from "../lib/logger"
import type { ServerApp } from "../types"
import type { RedisManager } from "./redis"
import type { JobType } from "./types"

export class QueueService {
  private logger: Logger
  private redisManager: RedisManager
  private jobQueue: Queue | null = null
  private queueEvents: QueueEvents | null = null

  constructor(serverApp: ServerApp, redisManager: RedisManager) {
    this.logger = serverApp.createLogger("queue-service")
    this.redisManager = redisManager
  }

  /**
   * Get or create the job queue
   */
  getJobQueue(): Queue {
    if (!this.jobQueue) {
      this.logger.debug("Creating job queue")
      this.jobQueue = new Queue("jobs", {
        connection: this.redisManager.getConnection(),
        defaultJobOptions: {
          // Smart defaults with exponential backoff
          attempts: serverConfig.WORKER_QUEUE_JOB_ATTEMPTS,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
          removeOnComplete: {
            age: 3600, // Keep completed jobs for 1 hour
            count: 100, // Keep last 100 completed jobs
          },
          removeOnFail: {
            age: 86400, // Keep failed jobs for 24 hours
            count: 500, // Keep last 500 failed jobs
          },
        },
      })
      this.logger.info("Job queue created successfully")
    }
    return this.jobQueue
  }

  /**
   * Get or create the queue events
   */
  getQueueEvents(): QueueEvents {
    if (!this.queueEvents) {
      this.logger.debug("Creating queue events")
      this.queueEvents = new QueueEvents("jobs", {
        connection: this.redisManager.getConnection(),
      })
      this.logger.info("Queue events created successfully")
    }
    return this.queueEvents
  }

  /**
   * Priority mapping for different job types
   */
  getJobPriority(jobType: JobType): number {
    switch (jobType) {
      case "watchChain":
        return 10 // High priority (time-sensitive blockchain monitoring)
      case "deployMulticall3":
        return 5 // Medium priority (deployment tasks)
      case "cleanupAuditLog":
        return 1 // Low priority (maintenance tasks)
      default:
        return 5 // Default medium priority
    }
  }

  /**
   * Graceful shutdown for queues
   */
  async gracefulShutdown(): Promise<void> {
    try {
      if (this.jobQueue) {
        this.logger.info("Closing job queue...")
        await this.jobQueue.close()
        this.jobQueue = null
        this.logger.info("Job queue closed")
      }

      if (this.queueEvents) {
        this.logger.info("Closing queue events...")
        await this.queueEvents.close()
        this.queueEvents = null
        this.logger.info("Queue events closed")
      }

      // Close Redis connection through RedisManager
      await this.redisManager.shutdown()
    } catch (error) {
      this.logger.error("Error during queue shutdown:", error)
    }
  }
}

// Legacy exports for backward compatibility
export function getJobQueue(): Queue {
  throw new Error("getJobQueue is deprecated. Use QueueService class instead.")
}

export function getQueueEvents(): QueueEvents {
  throw new Error(
    "getQueueEvents is deprecated. Use QueueService class instead.",
  )
}

export const jobQueue = new Proxy({} as Queue, {
  get() {
    throw new Error(
      "jobQueue proxy is deprecated. Use QueueService class instead.",
    )
  },
})

export const queueEvents = new Proxy({} as QueueEvents, {
  get() {
    throw new Error(
      "queueEvents proxy is deprecated. Use QueueService class instead.",
    )
  },
})

export function getJobPriority(): number {
  throw new Error(
    "getJobPriority is deprecated. Use QueueService class instead.",
  )
}

export async function gracefulQueueShutdown(): Promise<void> {
  throw new Error(
    "gracefulQueueShutdown is deprecated. Use QueueService class instead.",
  )
}
