#!/usr/bin/env bun

/**
 * Worker process entry point
 *
 * This file is spawned as a separate process by the WorkerManager
 * and runs the main worker loop.
 */

import { createServerApp } from "../bootstrap"
import { LOG_CATEGORIES } from "../lib/errors"
import { createLogger } from "../lib/logger"
import { WorkerIPCMessageType } from "./ipc-types"
import { WorkerSocketManager } from "./socket-manager"
import { runWorker } from "./worker"

const main = async () => {
  try {
    const logger = createLogger("worker")

    // Create worker-side SocketManager
    const socketManager = new WorkerSocketManager(logger)

    // Create the server app context for the worker (without worker manager to avoid circular dependency)
    const serverApp = await createServerApp({
      includeWorkerManager: false,
      socketManager,
    })

    // Override logger to use the worker-specific one
    const workerApp = {
      ...serverApp,
      app: null as any, // Workers don't need the Elysia app
      workerManager: null as any, // Workers don't need the worker manager
      createLogger: (category: string) =>
        createLogger(`${LOG_CATEGORIES.WORKER}-${category}`),
    }

    logger.info("Worker process starting")

    // Send startup message to parent process
    if (process.send) {
      process.send({
        type: WorkerIPCMessageType.WorkerStarted,
        pid: process.pid,
      })
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
    await runWorker(workerApp)
  } catch (err: any) {
    console.error("Worker process error:", err)
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

// Only run if this file is executed directly
if (import.meta.main) {
  main().catch((err) => {
    console.error("Worker process failed to start:", err)
    process.exit(1)
  })
}
