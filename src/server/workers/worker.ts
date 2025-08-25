import type { WebSocketMessage } from "../../shared/websocket/types"
import {
  getNextPendingJob,
  getTotalPendingJobs,
  markJobAsFailed,
  markJobAsStarted,
  markJobAsSucceeded,
  rescheduleCronJob,
  rescheduleFailedJob,
  scheduleCronJob,
} from "../db/worker"
import { LOG_CATEGORIES } from "../lib/errors"
import type { ServerApp } from "../types"
import { WorkerIPCMessageType } from "./ipc-types"
import { jobRegistry } from "./jobs/registry"
import type { JobParams } from "./jobs/types"
import { isValidJobType } from "./jobs/types"

const ONE_SECOND = 1000
const ONE_MINUTE = 60 * ONE_SECOND

const setupDefaultJobs = async (serverApp: ServerApp) => {
  const logger = serverApp.createLogger(LOG_CATEGORIES.WORKER)

  logger.debug("Setting up default jobs")

  // Remove old jobs every minute
  await scheduleCronJob(
    serverApp,
    {
      type: "removeOldWorkerJobs",
      userId: 0,
      autoRescheduleOnFailure: true,
      autoRescheduleOnFailureDelay: ONE_MINUTE,
    },
    "0 * * * * *", // every minute
  )

  // Watch chain every 3 seconds
  await scheduleCronJob(
    serverApp,
    {
      type: "watchChain",
      userId: 0,
      autoRescheduleOnFailure: true,
      autoRescheduleOnFailureDelay: 10 * ONE_SECOND,
    },
    "*/3 * * * * *", // every 3 seconds
  )

  logger.debug("Default jobs scheduled")
}

const handleJob = async (params: JobParams): Promise<object | undefined> => {
  const { job } = params

  if (!isValidJobType(job.type)) {
    throw new Error(`Unknown job type: ${job.type}`)
  }

  const jobHandler = jobRegistry[job.type as keyof typeof jobRegistry]
  if (!jobHandler) {
    throw new Error(`Job handler not found for type: ${job.type}`)
  }

  return await jobHandler.run(params)
}

/**
 * Helper function for workers to send messages to users via WebSocket
 */
export function sendMessageToUser(userId: number, message: WebSocketMessage) {
  if (process.send) {
    process.send({
      type: WorkerIPCMessageType.SendToUser,
      userId,
      message,
    })
  }
}

const dateBefore = (date: Date, now: number): boolean => {
  return date.getTime() <= now
}

export const runWorker = async (serverApp: ServerApp) => {
  const logger = serverApp.createLogger(LOG_CATEGORIES.WORKER)

  logger.info("Starting worker process")

  // Setup default jobs
  await setupDefaultJobs(serverApp)

  // Main worker loop
  let cycleCount = 0
  while (true) {
    cycleCount++
    logger.debug(`Starting worker cycle #${cycleCount}`)

    try {
      // Get total pending jobs
      const pendingJobs = await getTotalPendingJobs(serverApp)
      logger.debug(`Pending jobs: ${pendingJobs}`)

      if (pendingJobs > 0) {
        logger.debug("Fetching next job")

        const job = await getNextPendingJob(serverApp)
        logger.debug(
          `getNextPendingJob result:`,
          job ? `Job #${job.id} type=${job.type} due=${job.due}` : "null",
        )

        if (job) {
          if (dateBefore(job.due, Date.now())) {
            const jobLogger = logger.child(
              `job[${job.id}-${job.type}]${job.cronSchedule ? " (cron)" : ""}`,
            )

            jobLogger.debug(`Starting job execution for user ${job.userId}`)
            jobLogger.debug("Job data:", job.data)

            await markJobAsStarted(serverApp, job.id)

            try {
              const result = await handleJob({
                serverApp,
                log: jobLogger,
                job,
              })

              await markJobAsSucceeded(serverApp, job.id, result)
              jobLogger.debug(`Job completed successfully`)

              // Reschedule cron job if needed
              if (job.cronSchedule) {
                jobLogger.debug("Scheduling next cron job")
                const newJob = await rescheduleCronJob(serverApp, job)
                jobLogger.debug(
                  `Rescheduled as job #${newJob.id} due at ${newJob.due}`,
                )
              }
            } catch (err: any) {
              jobLogger.debug("Job execution failed:", err.message)
              jobLogger.debug("Full error details:", err)

              await markJobAsFailed(serverApp, job.id, { error: err.message })

              // Reschedule failed job if configured
              if (job.autoRescheduleOnFailure) {
                jobLogger.debug("Rescheduling failed job")
                const newJob = await rescheduleFailedJob(serverApp, job)
                jobLogger.debug(
                  `Rescheduled as job #${newJob.id} due at ${newJob.due}`,
                )
              }
            }
          } else {
            logger.debug(
              `Next job #${job.id} - ${job.type} for user ${job.userId} due at ${job.due}`,
            )
          }
        }
      }
    } catch (err: any) {
      logger.error("Error in worker cycle:", err)
      logger.debug("Full error details:", err)
    }

    // Wait before next loop
    logger.debug(
      `Worker cycle #${cycleCount} complete, sleeping for ${ONE_SECOND}ms`,
    )
    await new Promise((resolve) => setTimeout(resolve, ONE_SECOND))
    logger.debug(
      `Worker cycle #${cycleCount} sleep complete, starting next cycle`,
    )
  }
}
