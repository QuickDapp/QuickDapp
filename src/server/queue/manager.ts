import { type JobsOptions, type RepeatOptions } from "bullmq"
import { getJobPriority, jobQueue } from "./queues"
import type { JobData, JobType, QueueJob } from "./types"

export class QueueManager {
  /**
   * Submit a job to the queue with type safety
   */
  async submitJob<T extends JobType>(
    type: T,
    data: JobData<T>,
    userId?: number | null,
    options?: JobsOptions,
  ): Promise<string> {
    const priority = getJobPriority(type)

    const job = await jobQueue.add(
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
    const priority = getJobPriority(type)

    const repeatOptions: RepeatOptions = {
      pattern,
      key: repeatJobKey,
    }

    await jobQueue.add(
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
    return await jobQueue.getJob(jobId)
  }

  /**
   * Get all repeatable jobs
   */
  async getRepeatableJobs() {
    return await jobQueue.getRepeatableJobs()
  }

  /**
   * Pause the queue
   */
  async pause(): Promise<void> {
    await jobQueue.pause()
  }

  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    await jobQueue.resume()
  }

  /**
   * Clean up old jobs
   */
  async clean(
    maxAge: number,
    maxJobs: number,
    type: "completed" | "failed" = "completed",
  ): Promise<void> {
    await jobQueue.clean(maxAge, maxJobs, type)
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    await jobQueue.close()
  }
}
