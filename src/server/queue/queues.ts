import { Queue, QueueEvents } from "bullmq"
import { serverConfig } from "../../shared/config/server"
import { getSharedRedisConnection, shutdownSharedRedis } from "./redis"
import type { JobType } from "./types"

// Lazy-initialized queue and events to ensure proper environment loading
let _jobQueue: Queue | null = null
let _queueEvents: QueueEvents | null = null

// Get or create the job queue
export function getJobQueue(): Queue {
  if (!_jobQueue) {
    _jobQueue = new Queue("jobs", {
      connection: getSharedRedisConnection(),
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
  }
  return _jobQueue
}

// Get or create the queue events
export function getQueueEvents(): QueueEvents {
  if (!_queueEvents) {
    _queueEvents = new QueueEvents("jobs", {
      connection: getSharedRedisConnection(),
    })
  }
  return _queueEvents
}

// For backward compatibility, export lazy-initialized instances
export const jobQueue = new Proxy({} as Queue, {
  get(target, prop) {
    return getJobQueue()[prop as keyof Queue]
  },
  set(target, prop, value) {
    ;(getJobQueue() as any)[prop] = value
    return true
  },
})

export const queueEvents = new Proxy({} as QueueEvents, {
  get(target, prop) {
    return getQueueEvents()[prop as keyof QueueEvents]
  },
  set(target, prop, value) {
    ;(getQueueEvents() as any)[prop] = value
    return true
  },
})

// Priority mapping for different job types
export function getJobPriority(jobType: JobType): number {
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

// Graceful shutdown for queues
export async function gracefulQueueShutdown(): Promise<void> {
  try {
    if (_jobQueue) {
      console.log("🛑 Closing job queue...")
      await _jobQueue.close()
      _jobQueue = null
      console.log("✅ Job queue closed")
    }

    if (_queueEvents) {
      console.log("🛑 Closing queue events...")
      await _queueEvents.close()
      _queueEvents = null
      console.log("✅ Queue events closed")
    }

    // Close shared Redis connection
    await shutdownSharedRedis()
  } catch (error) {
    console.error("❌ Error during queue shutdown:", error)
  }
}
