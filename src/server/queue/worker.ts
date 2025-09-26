import { type ChildProcess, fork } from "node:child_process"
import os from "node:os"
import path from "node:path"
import { serverConfig } from "../../shared/config/server"
import type { Logger } from "../lib/logger"
import { LOG_CATEGORIES } from "../lib/logger"
import type { ServerApp } from "../types"
import { type WorkerIPCMessage, WorkerIPCMessageType } from "./ipc-types"
import { QueueManager } from "./manager"

class WorkerSubprocess {
  private process: ChildProcess | null = null
  private isShuttingDown = false
  private logger: Logger
  private restartAttempts = 0
  private readonly MAX_RESTART_ATTEMPTS = 3

  constructor(
    private workerId: number,
    private serverApp: ServerApp,
  ) {
    this.logger = serverApp.createLogger(
      `${LOG_CATEGORIES.WORKER_MANAGER}-${workerId}`,
    )
  }

  getProcess(): ChildProcess | null {
    return this.process
  }

  start(): void {
    this.logger.debug(`Starting worker subprocess ${this.workerId}`)

    // Determine entry point based on environment
    const serverEntryPoint =
      serverConfig.NODE_ENV === "production"
        ? process.argv[1] || path.resolve(__dirname, "../index.js")
        : path.resolve(__dirname, "../index.ts")

    this.process = fork(serverEntryPoint, [], {
      env: {
        ...process.env,
        WORKER_ID: this.workerId.toString(),
      },
      silent: false, // Let worker logs through
    })

    this.process.on("message", (message: WorkerIPCMessage) => {
      switch (message.type) {
        case WorkerIPCMessageType.WorkerStarted:
          this.logger.info(
            `Worker ${this.workerId} started (PID: ${message.pid})`,
          )
          this.restartAttempts = 0 // Reset on successful start
          break

        case WorkerIPCMessageType.WorkerShutdown:
          this.logger.info(
            `Worker ${this.workerId} shutdown (PID: ${message.pid})`,
          )
          break

        case WorkerIPCMessageType.WorkerError:
          this.logger.error(`Worker ${this.workerId} error: ${message.error}`)
          break

        case WorkerIPCMessageType.Heartbeat:
          this.logger.debug(`Worker ${this.workerId} heartbeat`)
          break

        case WorkerIPCMessageType.SendToUser: {
          // Relay WebSocket message to actual SocketManager
          const msg = message as any
          this.serverApp.socketManager.sendToUser(msg.userId, msg.message)
          break
        }

        case WorkerIPCMessageType.Broadcast: {
          // Relay broadcast to all users
          const msg = message as any
          this.serverApp.socketManager.broadcast(msg.message)
          break
        }
      }
    })

    this.process.on("exit", (code) => {
      if (!this.isShuttingDown) {
        this.logger.warn(`Worker ${this.workerId} exited with code ${code}`)

        // Auto-restart with backoff
        if (this.restartAttempts < this.MAX_RESTART_ATTEMPTS) {
          this.restartAttempts++
          const delay = Math.min(
            1000 * Math.pow(2, this.restartAttempts),
            10000,
          )
          this.logger.info(
            `Restarting worker ${this.workerId} in ${delay}ms (attempt ${this.restartAttempts})`,
          )
          setTimeout(() => this.start(), delay)
        } else {
          this.logger.error(
            `Worker ${this.workerId} exceeded max restart attempts`,
          )
        }
      }
    })

    this.process.on("error", (error) => {
      this.logger.error(`Worker ${this.workerId} subprocess error:`, error)
    })
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true
    if (this.process && !this.process.killed) {
      this.logger.debug(`Sending SIGTERM to worker ${this.workerId}`)
      this.process.kill("SIGTERM")

      // Give it time to shutdown gracefully
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Force kill if still alive
      if (this.process && !this.process.killed) {
        this.logger.warn(`Force killing worker ${this.workerId}`)
        this.process.kill("SIGKILL")
      }
    }
  }
}

export const createQueueManager = async (
  serverApp: ServerApp,
  workerCountOverride?: number,
): Promise<{ queueManager: QueueManager; workers: WorkerSubprocess[] }> => {
  const logger = serverApp.createLogger(LOG_CATEGORIES.WORKER_MANAGER)

  const workerCount =
    workerCountOverride ??
    (serverConfig.WORKER_COUNT === "cpus"
      ? os.cpus().length
      : serverConfig.WORKER_COUNT)

  const workers: WorkerSubprocess[] = []

  // Fork subprocess for each worker
  for (let i = 0; i < workerCount; i++) {
    const worker = new WorkerSubprocess(i + 1, serverApp)
    worker.start()
    workers.push(worker)
  }

  logger.info(
    `Started ${workerCount} worker subprocesses (concurrency: ${serverConfig.WORKER_QUEUE_CONCURRENCY}/worker)`,
  )

  // Create QueueManager instance
  const queueManager = new QueueManager()

  // Setup default jobs
  await setupDefaultJobs(queueManager, logger)

  // Schedule Multicall3 deployment
  logger.info("Scheduling Multicall3 deployment check...")
  await queueManager.submitJob("deployMulticall3", { forceRedeploy: false })

  // Enhance shutdown to include subprocess cleanup
  const originalShutdown = queueManager.shutdown.bind(queueManager)
  queueManager.shutdown = async () => {
    logger.info("Shutting down all worker subprocesses...")
    await Promise.all(workers.map((w) => w.shutdown()))
    await originalShutdown()
    logger.info("All workers and queue shut down")
  }

  return { queueManager, workers }
}

async function setupDefaultJobs(queueManager: QueueManager, logger: Logger) {
  logger.info("Setting up default cron jobs...")

  // Set up recurring jobs
  await queueManager.scheduleCronJob(
    "watchChain",
    "*/30 * * * * *", // Every 30 seconds
    {},
    "watch-chain",
  )

  await queueManager.scheduleCronJob(
    "cleanupAuditLog",
    "0 3 * * *", // Daily at 3 AM
    { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days in milliseconds
    "cleanup-audit-log",
  )

  logger.info("Default cron jobs scheduled successfully")
}
