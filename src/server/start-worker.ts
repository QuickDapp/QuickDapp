/**
 * Worker process functionality
 * This file is imported by src/server/index.ts when running in worker mode
 */

import { createServerApp } from "./bootstrap"
import { createLogger } from "./lib/logger"
import { runWorker } from "./workers/worker"

export const startWorker = async () => {
  const logger = createLogger("worker")

  try {
    logger.info("Worker process starting")

    // Send startup message to parent process
    if (process.send) {
      process.send({ type: "worker-started", pid: process.pid })
    }

    // Create the server app context for the worker (without worker manager to avoid circular dependency)
    logger.debug("Worker creating database connection...")
    const baseServerApp = await createServerApp({ includeWorkerManager: false })
    logger.debug("Worker database connection created successfully")

    const serverApp = {
      ...baseServerApp,
      app: null as any, // Workers don't need the Elysia app
      workerManager: null as any, // Workers don't need the worker manager
    }

    // Set up graceful shutdown
    const shutdown = async () => {
      logger.info("Worker process shutting down")
      if (process.send) {
        process.send({ type: "worker-shutdown", pid: process.pid })
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
        type: "worker-error",
        error: err.message,
        pid: process.pid,
      })
    }
    process.exit(1)
  }
}
