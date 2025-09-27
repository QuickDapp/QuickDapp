import { type JobsOptions, type RepeatOptions } from "bullmq"
import type { ServerApp } from "../types"
import type { QueueService } from "./queues"
import type { JobData, JobType } from "./types"

export class QueueManager {
  private queueService: QueueService

  constructor(serverApp: ServerApp) {
    this.queueService = serverApp.queueService
  }
  /**
   * Submit a job to the queue with type safety
   */
  async submitJob<T extends JobType>(
    type: T,
    data: JobData<T>,
    userId?: number | null,
    options?: JobsOptions,
  ): Promise<string> {
    const priority = this.queueService.getJobPriority(type)

    const job = await this.queueService.getJobQueue().add(
      type,
      {
        userId: userId ?? null,
        data,
      },
      {
        priority,
        ...options,
      },
    )

    if (!job.id) {
      throw new Error(`Failed to submit job of type: ${type}`)
    }

    return job.id
  }

  /**
   * Schedule a recurring job using cron pattern
   */
  async scheduleCronJob<T extends JobType>(
    type: T,
    pattern: string,
    data: JobData<T>,
    repeatJobKey: string,
  ): Promise<void> {
    const priority = this.queueService.getJobPriority(type)

    const repeatOptions: RepeatOptions = {
      pattern,
      key: repeatJobKey,
    }

    await this.queueService.getJobQueue().add(
      type,
      {
        userId: null, // System jobs have no user
        data,
      },
      {
        priority,
        repeat: repeatOptions,
      },
    )
  }

  /**
   * Remove a scheduled cron job
   */
  async removeCronJob(repeatJobKey: string): Promise<void> {
    const jobQueue = this.queueService.getJobQueue()
    const repeatableJobs = await jobQueue.getRepeatableJobs()

    for (const job of repeatableJobs) {
      if (job.key === repeatJobKey) {
        await jobQueue.removeRepeatableByKey(repeatJobKey)
        break
      }
    }
  }

  /**
   * Get queue health statistics
   */
  async getHealth() {
    const jobQueue = this.queueService.getJobQueue()
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
   * Get job by ID
   */
  async getJob(jobId: string) {
    return await this.queueService.getJobQueue().getJob(jobId)
  }

  /**
   * Get all repeatable jobs
   */
  async getRepeatableJobs() {
    return await this.queueService.getJobQueue().getRepeatableJobs()
  }

  /**
   * Pause the queue
   */
  async pause(): Promise<void> {
    await this.queueService.getJobQueue().pause()
  }

  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    await this.queueService.getJobQueue().resume()
  }

  /**
   * Clean up old jobs
   */
  async clean(
    maxAge: number,
    maxJobs: number,
    type: "completed" | "failed" = "completed",
  ): Promise<void> {
    await this.queueService.getJobQueue().clean(maxAge, maxJobs, type)
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    await this.queueService.gracefulShutdown()
  }
}
