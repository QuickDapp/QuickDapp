/**
 * Worker subprocess entry point
 * Creates BullMQ worker within subprocess for true multi-core utilization
 */

import { Worker } from "bullmq"
import { serverConfig } from "../../shared/config/server"
import { createServerApp } from "../bootstrap"
import { createRootLogger, getLogLevel } from "../lib/logger"
import type { ServerApp } from "../types"
import { WorkerIPCMessageType } from "./ipc-types"
import { createProcessor } from "./processor"
import { getSharedRedisConnection } from "./redis"
import { WorkerSocketManager } from "./socket-manager"

export const startWorker = async () => {
  const workerId = process.env.WORKER_ID

  if (!workerId) {
    console.error("WORKER_ID environment variable is required")
    process.exit(1)
  }

  // Create worker-specific logger
  const logger = createRootLogger(
    `worker-${workerId}`,
    getLogLevel(serverConfig.WORKER_LOG_LEVEL),
  )

  try {
    logger.info("Worker subprocess starting")

    // Send startup message to parent
    if (process.send) {
      process.send({
        type: WorkerIPCMessageType.WorkerStarted,
        workerId,
        pid: process.pid,
      })
    }

    // Create worker-side SocketManager for WebSocket IPC
    const socketManager = new WorkerSocketManager(logger)

    // Create ServerApp context (without worker manager to avoid circular dependency)
    logger.debug("Worker creating database connection...")
    const baseServerApp = await createServerApp({
      includeWorkerManager: false,
      socketManager,
      rootLogger: logger,
    })
    logger.debug("Worker database connection created successfully")

    const serverApp: ServerApp = {
      ...baseServerApp,
      app: null as any, // Workers don't need Elysia
      queueManager: null as any, // Workers don't need queue manager
    }

    // Create BullMQ worker with configurable concurrency
    const bullWorker = new Worker("jobs", createProcessor(serverApp), {
      connection: getSharedRedisConnection(),
      concurrency: serverConfig.WORKER_QUEUE_CONCURRENCY, // Default: 1
      stalledInterval: serverConfig.WORKER_QUEUE_STALLED_INTERVAL,
      maxStalledCount: 1,
    })

    // BullMQ worker event handlers
    bullWorker.on("ready", () => {
      logger.info(`Worker ${workerId} BullMQ ready`)
    })

    bullWorker.on("active", (job) => {
      logger.debug(`Worker ${workerId} processing job ${job.id} (${job.name})`)
    })

    bullWorker.on("completed", (job) => {
      logger.debug(`Worker ${workerId} completed job ${job.id} (${job.name})`)
    })

    bullWorker.on("failed", (job, err) => {
      logger.error(`Worker ${workerId} failed job ${job?.id}:`, err.message)
    })

    bullWorker.on("error", (error) => {
      logger.error(`Worker ${workerId} BullMQ error:`, error)
    })

    // Graceful shutdown
    const shutdown = async () => {
      logger.info("Worker subprocess shutting down")

      // Close BullMQ worker
      await bullWorker.close()

      // Notify parent
      if (process.send) {
        process.send({
          type: WorkerIPCMessageType.WorkerShutdown,
          workerId,
          pid: process.pid,
        })
      }

      process.exit(0)
    }

    process.on("SIGTERM", shutdown)
    process.on("SIGINT", shutdown)

    // Optional: Send periodic heartbeat
    if (serverConfig.WORKER_HEARTBEAT_INTERVAL) {
      setInterval(() => {
        if (process.send) {
          process.send({ type: WorkerIPCMessageType.Heartbeat, workerId })
        }
      }, serverConfig.WORKER_HEARTBEAT_INTERVAL)
    }

    logger.info(`Worker ${workerId} subprocess ready (PID: ${process.pid})`)
  } catch (err: any) {
    logger.error("Worker subprocess error:", err)
    if (process.send) {
      process.send({
        type: WorkerIPCMessageType.WorkerError,
        workerId,
        error: err.message,
        pid: process.pid,
      })
    }
    process.exit(1)
  }
}
