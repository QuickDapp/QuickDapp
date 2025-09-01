/**
 * Worker process functionality
 * This file is imported by src/server/index.ts when running in worker mode
 */

import { serverConfig } from "../shared/config/server"
import { createServerApp } from "./bootstrap"
import { createRootLogger, getLogLevel } from "./lib/logger"
import type { ServerApp } from "./types"
import { WorkerIPCMessageType } from "./workers/ipc-types"
import { WorkerSocketManager } from "./workers/socket-manager"
import { runWorker } from "./workers/worker"

export const startWorker = async () => {
  // Create worker root logger instance
  const logger = createRootLogger(
    `worker-${process.env.WORKER_ID}`,
    getLogLevel(serverConfig.WORKER_LOG_LEVEL),
  )

  try {
    logger.info("Worker process starting")

    // Send startup message to parent process
    if (process.send) {
      process.send({
        type: WorkerIPCMessageType.WorkerStarted,
        pid: process.pid,
      })
    }

    // Create worker-side SocketManager
    const socketManager = new WorkerSocketManager(logger)

    // Create the server app context for the worker (without worker manager to avoid circular dependency)
    logger.debug("Worker creating database connection...")
    const baseServerApp = await createServerApp({
      includeWorkerManager: false,
      socketManager,
      rootLogger: logger,
    })
    logger.debug("Worker database connection created successfully")

    const serverApp: ServerApp = {
      ...baseServerApp,
      app: null as any, // Workers don't need the Elysia app
      workerManager: null as any, // Workers don't need the worker manager
    }

    // Set up graceful shutdown
    const shutdown = async () => {
      logger.info("Worker process shutting down")
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

    // Start the worker loop
    await runWorker(serverApp)
  } catch (err: any) {
    logger.error("Worker process error:", err)
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
