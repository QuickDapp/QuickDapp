import { type ChildProcess, fork } from "node:child_process"
import os from "node:os"
import path from "node:path"
import { serverConfig } from "../../shared/config/env"
import { scheduleJob } from "../db/worker"
import { LOG_CATEGORIES } from "../lib/errors"
import type { Logger } from "../lib/logger"
import type { ServerApp } from "../types"

export interface WorkerJob {
  id: string
  type: string
  data: unknown
  userId: number
}

export interface WorkerManager {
  submitJob: (job: WorkerJob) => Promise<void>
  getWorkerCount: () => number
  shutdown: () => Promise<void>
}

class WorkerProcess {
  private process: ChildProcess | null = null
  private isShuttingDown = false
  private logger: Logger

  constructor(
    private workerId: number,
    private serverApp: ServerApp,
  ) {
    this.logger = serverApp.createLogger(`${LOG_CATEGORIES.WORKER}-${workerId}`)
  }

  start(): void {
    this.logger.debug(`Starting worker ${this.workerId}`)

    // Fork the server entry point to create a worker
    // In development: use the TypeScript file
    // In production: use the main entry point from package.json or the current executable
    const serverEntryPoint =
      serverConfig.NODE_ENV === "production"
        ? process.argv[0] // Use the same executable (bun binary or node)
        : path.resolve(__dirname, "../index.ts")

    this.process = fork(serverEntryPoint!, [], {
      env: {
        ...process.env,
        WORKER_ID: this.workerId.toString(),
      },
      silent: false,
    })

    this.process.on("exit", (code) => {
      if (!this.isShuttingDown) {
        this.logger.warn(`Worker ${this.workerId} exited with code ${code}`)
        // Auto-restart worker if it wasn't intentionally shut down
        setTimeout(() => this.start(), 1000)
      }
    })

    this.process.on("error", (error) => {
      this.logger.error(`Worker ${this.workerId} error:`, error)
    })

    this.process.on("message", (message: any) => {
      if (message?.type === "worker-started") {
        this.logger.info(
          `Worker ${this.workerId} started (PID: ${message.pid})`,
        )
      } else if (message?.type === "worker-shutdown") {
        this.logger.info(
          `Worker ${this.workerId} shutdown (PID: ${message.pid})`,
        )
      } else if (message?.type === "worker-error") {
        this.logger.error(`Worker ${this.workerId} error: ${message.error}`)
      } else if (message?.type === "heartbeat") {
        this.logger.debug(`Worker ${this.workerId} heartbeat`)
      }
    })
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true
    if (this.process) {
      this.logger.debug(`Shutting down worker ${this.workerId}`)
      this.process.kill("SIGTERM")

      // Give the process time to shut down gracefully
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (this.process) {
            this.logger.warn(`Force killing worker ${this.workerId}`)
            this.process.kill("SIGKILL")
          }
          resolve()
        }, 5000)

        this.process?.on("exit", () => {
          clearTimeout(timeout)
          resolve()
        })
      })
    }
  }
}

export const createWorkerManager = async (
  serverApp: ServerApp,
): Promise<WorkerManager> => {
  const logger = serverApp.createLogger(LOG_CATEGORIES.WORKER_MANAGER)
  const workerCount =
    serverConfig.WORKER_COUNT === "cpus"
      ? os.cpus().length
      : serverConfig.WORKER_COUNT

  const workers: WorkerProcess[] = []

  // Initialize workers
  for (let i = 0; i < workerCount; i++) {
    const worker = new WorkerProcess(i + 1, serverApp)
    worker.start()
    workers.push(worker)
  }

  logger.info(`Initialized ${workerCount} worker processes`)

  // Create the WorkerManager instance first so we can use submitJob
  const workerManager = {
    submitJob: async (job: WorkerJob) => {
      logger.debug(`Scheduling job ${job.id} of type ${job.type}`)
      await scheduleJob(serverApp, {
        type: job.type,
        userId: job.userId,
        data: job.data,
      })
      logger.debug(`Job ${job.id} scheduled successfully`)
    },

    getWorkerCount: () => workers.length,

    shutdown: async () => {
      logger.info("Shutting down all workers...")
      await Promise.all(workers.map((worker) => worker.shutdown()))
      logger.info("All workers shut down")
    },
  }

  // Schedule Multicall3 deployment immediately
  logger.info("Scheduling Multicall3 deployment check...")
  await workerManager.submitJob({
    id: `multicall3-deploy-startup-${Date.now()}`,
    type: "deployMulticall3",
    data: { forceRedeploy: false },
    userId: 0, // System job
  })

  return workerManager
}
