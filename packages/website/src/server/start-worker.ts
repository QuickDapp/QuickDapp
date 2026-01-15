import * as Sentry from "@sentry/node"
import { serverConfig } from "../shared/config/server"
import { createServerApp } from "./bootstrap"
import { createRootLogger, getLogLevel } from "./lib/logger"
import { initializeSentry } from "./lib/sentry"
import type { ServerApp } from "./types"
import { WorkerIPCMessageType } from "./workers/ipc-types"
import { runWorker } from "./workers/worker"

export const startWorker = async (workerId: string) => {
  if (serverConfig.SENTRY_WORKER_DSN) {
    initializeSentry({
      dsn: serverConfig.SENTRY_WORKER_DSN,
      environment: serverConfig.NODE_ENV,
      tracesSampleRate: serverConfig.SENTRY_TRACES_SAMPLE_RATE,
      profileSessionSampleRate: serverConfig.SENTRY_PROFILE_SESSION_SAMPLE_RATE,
    })
  }

  const logger = createRootLogger(
    `worker-${workerId}`,
    getLogLevel(serverConfig.WORKER_LOG_LEVEL),
  )

  try {
    logger.info("Worker process starting")

    if (process.send) {
      process.send({
        type: WorkerIPCMessageType.WorkerStarted,
        pid: process.pid,
      })
    }

    logger.debug("Worker creating database connection...")
    const baseServerApp = await createServerApp({
      includeWorkerManager: false,
      rootLogger: logger,
    })
    logger.debug("Worker database connection created successfully")

    const serverApp: ServerApp = {
      ...baseServerApp,
      app: null as any,
      workerManager: null as any,
    }

    const shutdown = async () => {
      logger.info("Worker process shutting down")

      if (serverConfig.SENTRY_WORKER_DSN) {
        await Sentry.close(2000)
        logger.info("Sentry events flushed")
      }

      if (process.send) {
        process.send({
          type: WorkerIPCMessageType.WorkerShutdown,
          pid: process.pid,
        })
      }
      process.exit(0)
    }

    process.on("SIGTERM", shutdown)
    process.on("SIGINT", shutdown)

    process.on("uncaughtException", (error) => {
      logger.error("Worker uncaught exception:", error)
      Sentry.captureException(error)
      process.exit(1)
    })

    process.on("unhandledRejection", (reason) => {
      logger.error("Worker unhandled rejection:", reason)
      Sentry.captureException(reason)
      process.exit(1)
    })

    await runWorker(serverApp)
  } catch (err: any) {
    logger.error("Worker process error:", err)
    Sentry.captureException(err)
    if (process.send) {
      process.send({
        type: WorkerIPCMessageType.WorkerError,
        error: err.message,
        pid: process.pid,
      })
    }
    process.exit(1)
  }
}
