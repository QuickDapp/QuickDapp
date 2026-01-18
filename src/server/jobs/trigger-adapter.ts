/**
 * Trigger.dev Adapter
 * Coordinates job execution between local database and Trigger.dev cloud
 * Provides unified interface for scheduling, tracking, and canceling jobs
 */

import { tasks, runs, schedules } from "@trigger.dev/sdk/v3"
import { eq, and, isNull } from "drizzle-orm"
import type { ServerApp } from "../types"
import type { WorkerJob } from "../db/schema"
import { workerJobs } from "../db/schema"
import {
  scheduleJob as scheduleInternalJob,
  scheduleCronJob as scheduleInternalCronJob,
  type WorkerJobConfig,
} from "../db/worker"
import { withTransaction } from "../db/shared"
import { logger } from "../lib/logger"

const log = logger({ category: "trigger-adapter" })

export type JobExecutor = "internal" | "trigger"

export interface TriggerJobConfig<T = unknown> extends WorkerJobConfig<T> {
  executor: JobExecutor
  triggerTaskId?: string // Required if executor is "trigger"
  retryConfig?: {
    maxAttempts?: number
    minTimeoutInMs?: number
    maxTimeoutInMs?: number
    factor?: number
    randomize?: boolean
  }
}

/**
 * Schedule a job with automatic routing to internal or Trigger.dev executor
 */
export async function scheduleUnifiedJob<T = unknown>(
  serverApp: ServerApp,
  config: TriggerJobConfig<T>,
): Promise<WorkerJob> {
  if (config.executor === "trigger") {
    return scheduleTriggerJob(serverApp, config)
  }
  return scheduleInternalJob(serverApp, config)
}

/**
 * Schedule a cron job with automatic routing
 */
export async function scheduleUnifiedCronJob<T = unknown>(
  serverApp: ServerApp,
  config: TriggerJobConfig<T>,
  cronSchedule: string,
): Promise<WorkerJob> {
  if (config.executor === "trigger") {
    return scheduleTriggerCronJob(serverApp, config, cronSchedule)
  }
  return scheduleInternalCronJob(serverApp, config, cronSchedule)
}

/**
 * Schedule a one-time job on Trigger.dev while maintaining DB tracking
 */
async function scheduleTriggerJob<T = unknown>(
  serverApp: ServerApp,
  config: TriggerJobConfig<T>,
): Promise<WorkerJob> {
  if (!config.triggerTaskId) {
    throw new Error("triggerTaskId is required for Trigger.dev jobs")
  }

  return withTransaction(serverApp.db, async (tx) => {
    // Cancel any pending jobs with same tag
    await cancelPendingJobsByTag(tx, config.tag)

    // Create DB record first (source of truth)
    const jobData = {
      tag: config.tag,
      type: config.type,
      userId: config.userId,
      data: (config.data || {}) as object,
      due: config.due || new Date(),
      removeAt: new Date(
        (config.due?.getTime() || Date.now()) + (config.removeDelay || 3600000),
      ),
      autoRescheduleOnFailure: !!config.autoRescheduleOnFailure,
      autoRescheduleOnFailureDelay: config.autoRescheduleOnFailureDelay || 0,
      removeDelay: config.removeDelay || 3600000,
      persistent: !!config.persistent,
      executor: "trigger" as const,
      triggerStatus: "PENDING" as const,
    }

    const [dbJob] = await tx.insert(workerJobs).values(jobData).returning()

    if (!dbJob) {
      throw new Error("Failed to create job in database")
    }

    try {
      // Trigger the job on Trigger.dev
      const handle = await tasks.trigger(config.triggerTaskId, config.data, {
        idempotencyKey: `job-${dbJob.id}`,
        delay: config.due
          ? `${Math.max(0, config.due.getTime() - Date.now())}ms`
          : undefined,
        tags: [config.tag, `db-id:${dbJob.id}`],
        metadata: {
          dbJobId: dbJob.id.toString(),
          tag: config.tag,
          userId: config.userId.toString(),
        },
        ...(config.retryConfig && { retry: config.retryConfig }),
      })

      // Update DB with Trigger.dev run ID
      const [updatedJob] = await tx
        .update(workerJobs)
        .set({
          triggerRunId: handle.id,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(workerJobs.id, dbJob.id))
        .returning()

      log.info("Scheduled Trigger.dev job", {
        dbJobId: dbJob.id,
        triggerRunId: handle.id,
        taskId: config.triggerTaskId,
        tag: config.tag,
      })

      return updatedJob!
    } catch (error) {
      log.error("Failed to schedule Trigger.dev job", { error, config })
      // Mark job as failed in DB but keep record for debugging
      await tx
        .update(workerJobs)
        .set({
          started: new Date(),
          finished: new Date(),
          success: false,
          result: {
            error: "Failed to schedule on Trigger.dev",
            details: error instanceof Error ? error.message : String(error),
          },
          updatedAt: new Date(),
        })
        .where(eq(workerJobs.id, dbJob.id))

      throw error
    }
  })
}

/**
 * Schedule a recurring cron job on Trigger.dev
 */
async function scheduleTriggerCronJob<T = unknown>(
  serverApp: ServerApp,
  config: TriggerJobConfig<T>,
  cronSchedule: string,
): Promise<WorkerJob> {
  if (!config.triggerTaskId) {
    throw new Error("triggerTaskId is required for Trigger.dev cron jobs")
  }

  return withTransaction(serverApp.db, async (tx) => {
    await cancelPendingJobsByTag(tx, config.tag)

    // Create DB record
    const jobData = {
      tag: config.tag,
      type: config.type,
      userId: config.userId,
      data: (config.data || {}) as object,
      due: new Date(), // Cron jobs start immediately
      removeAt: new Date(Date.now() + (config.removeDelay || 3600000)),
      cronSchedule,
      autoRescheduleOnFailure: !!config.autoRescheduleOnFailure,
      autoRescheduleOnFailureDelay: config.autoRescheduleOnFailureDelay || 0,
      removeDelay: config.removeDelay || 3600000,
      persistent: !!config.persistent,
      executor: "trigger" as const,
      triggerStatus: "PENDING" as const,
    }

    const [dbJob] = await tx.insert(workerJobs).values(jobData).returning()

    if (!dbJob) {
      throw new Error("Failed to create cron job in database")
    }

    try {
      // Create schedule on Trigger.dev
      const schedule = await schedules.create({
        task: config.triggerTaskId,
        cron: cronSchedule,
        // Use job ID as external ID for easy lookup
        externalId: `job-${dbJob.id}`,
        deduplicationKey: config.tag,
      })

      // Update DB with schedule ID
      const [updatedJob] = await tx
        .update(workerJobs)
        .set({
          triggerScheduleId: schedule.id,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(workerJobs.id, dbJob.id))
        .returning()

      log.info("Scheduled Trigger.dev cron job", {
        dbJobId: dbJob.id,
        scheduleId: schedule.id,
        taskId: config.triggerTaskId,
        cron: cronSchedule,
      })

      return updatedJob!
    } catch (error) {
      log.error("Failed to schedule Trigger.dev cron job", { error, config })
      await tx
        .update(workerJobs)
        .set({
          started: new Date(),
          finished: new Date(),
          success: false,
          result: {
            error: "Failed to schedule cron on Trigger.dev",
            details: error instanceof Error ? error.message : String(error),
          },
          updatedAt: new Date(),
        })
        .where(eq(workerJobs.id, dbJob.id))

      throw error
    }
  })
}

/**
 * Cancel a job (works for both internal and Trigger.dev jobs)
 */
export async function cancelJob(
  serverApp: ServerApp,
  jobId: number,
): Promise<WorkerJob> {
  return withTransaction(serverApp.db, async (tx) => {
    const [job] = await tx
      .select()
      .from(workerJobs)
      .where(eq(workerJobs.id, jobId))
      .limit(1)

    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    if (job.finished) {
      log.warn("Attempted to cancel already finished job", { jobId })
      return job
    }

    // Mark as cancel requested in DB
    const [updatedJob] = await tx
      .update(workerJobs)
      .set({
        cancelRequested: true,
        updatedAt: new Date(),
      })
      .where(eq(workerJobs.id, jobId))
      .returning()

    if (job.executor === "trigger" && job.triggerRunId) {
      try {
        // Cancel on Trigger.dev
        await runs.cancel(job.triggerRunId)
        log.info("Canceled Trigger.dev run", {
          jobId,
          runId: job.triggerRunId,
        })

        // Update status immediately
        await tx
          .update(workerJobs)
          .set({
            triggerStatus: "CANCELED",
            finished: new Date(),
            success: false,
            result: { canceled: true },
            updatedAt: new Date(),
          })
          .where(eq(workerJobs.id, jobId))
      } catch (error) {
        log.error("Failed to cancel Trigger.dev run", {
          error,
          jobId,
          runId: job.triggerRunId,
        })
        // Still mark as canceled locally even if remote cancel fails
        await tx
          .update(workerJobs)
          .set({
            finished: new Date(),
            success: false,
            result: {
              canceled: true,
              note: "Remote cancel failed but marked locally",
            },
            updatedAt: new Date(),
          })
          .where(eq(workerJobs.id, jobId))
      }
    } else {
      // Internal job - mark as finished/canceled
      await tx
        .update(workerJobs)
        .set({
          started: job.started || new Date(),
          finished: new Date(),
          success: false,
          result: { canceled: true },
          updatedAt: new Date(),
        })
        .where(eq(workerJobs.id, jobId))
    }

    return updatedJob!
  })
}

/**
 * Cancel a cron schedule (removes recurring job)
 */
export async function cancelCronSchedule(
  serverApp: ServerApp,
  jobId: number,
): Promise<void> {
  const [job] = await serverApp.db
    .select()
    .from(workerJobs)
    .where(eq(workerJobs.id, jobId))
    .limit(1)

  if (!job) {
    throw new Error(`Job ${jobId} not found`)
  }

  if (job.executor === "trigger" && job.triggerScheduleId) {
    try {
      await schedules.del(job.triggerScheduleId)
      log.info("Deleted Trigger.dev schedule", {
        jobId,
        scheduleId: job.triggerScheduleId,
      })
    } catch (error) {
      log.error("Failed to delete Trigger.dev schedule", {
        error,
        jobId,
        scheduleId: job.triggerScheduleId,
      })
      throw error
    }
  }

  // Mark job as canceled in DB
  await serverApp.db
    .update(workerJobs)
    .set({
      cancelRequested: true,
      finished: new Date(),
      success: false,
      result: { scheduleDeleted: true },
      updatedAt: new Date(),
    })
    .where(eq(workerJobs.id, jobId))
}

/**
 * Helper: Cancel all pending jobs with a given tag
 */
async function cancelPendingJobsByTag(
  tx: any,
  tag: string,
): Promise<void> {
  const now = new Date()

  await tx
    .update(workerJobs)
    .set({
      started: now,
      finished: now,
      success: false,
      result: { error: "Job cancelled due to new job being created" },
      updatedAt: now,
    })
    .where(and(eq(workerJobs.tag, tag), isNull(workerJobs.finished)))
}
