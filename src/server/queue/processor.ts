import type { Job as BullMQJob } from "bullmq"
import { recordJobExecution } from "../db/worker-audit"
import type { ServerApp } from "../types"
import { jobRegistry } from "./jobs/registry"
import type { JobType, QueueJob } from "./types"

export function createProcessor(serverApp: ServerApp) {
  return async (bullMQJob: BullMQJob) => {
    const jobType = bullMQJob.name as JobType
    const handler = jobRegistry[jobType]

    if (!handler) {
      throw new Error(`Unknown job type: ${jobType}`)
    }

    const logger = serverApp.createLogger(`job-${jobType}`)
    const startTime = Date.now()

    // Create job object for handler
    const queueJob: QueueJob = {
      id: bullMQJob.id!,
      type: jobType,
      userId: bullMQJob.data.userId,
      data: bullMQJob.data.data,
    }

    logger.info("Starting job execution", {
      jobId: bullMQJob.id,
      jobType,
      userId: bullMQJob.data.userId,
    })

    try {
      // Execute job handler
      const result = await handler.run({
        serverApp,
        log: logger,
        job: queueJob,
      })

      const durationMs = Date.now() - startTime

      logger.info("Job completed successfully", {
        jobId: bullMQJob.id,
        jobType,
        durationMs,
        result: result ? "has result" : "no result",
      })

      // Record successful execution in audit log
      await recordJobExecution(serverApp, {
        jobId: bullMQJob.id!,
        type: jobType,
        userId: bullMQJob.data.userId,
        data: bullMQJob.data.data,
        result,
        status: "completed",
        startedAt: new Date(bullMQJob.processedOn!),
        completedAt: new Date(),
        durationMs,
      })

      return result
    } catch (error) {
      const durationMs = Date.now() - startTime
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      logger.error("Job failed with error", {
        jobId: bullMQJob.id,
        jobType,
        error: errorMessage,
        durationMs,
      })

      // Record failed execution in audit log
      await recordJobExecution(serverApp, {
        jobId: bullMQJob.id!,
        type: jobType,
        userId: bullMQJob.data.userId,
        data: bullMQJob.data.data,
        error: errorMessage,
        status: "failed",
        startedAt: new Date(bullMQJob.processedOn!),
        completedAt: new Date(),
        durationMs,
      })

      // Re-throw to let BullMQ handle retries
      throw error
    }
  }
}
