import { type ChildProcess, spawn } from "node:child_process"
import os from "node:os"
import { serverConfig } from "../../shared/config/env"
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
    this.logger = serverApp.createLogger(`worker-${workerId}`)
  }

  start(): void {
    this.logger.debug(`Starting worker ${this.workerId}`)

    // For now, create a simple worker that just logs
    // In the future, this will spawn actual worker processes
    this.process = spawn(
      "node",
      [
        "-e",
        `
      const workerId = ${this.workerId};
      console.log(\`Worker \${workerId} started\`);
      
      // Keep the process alive
      setInterval(() => {
        // Worker heartbeat
      }, 30000);
    `,
      ],
      {
        stdio: ["pipe", "pipe", "pipe", "ipc"],
      },
    )

    this.process.stdout?.on("data", (data) => {
      this.logger.debug(
        `Worker ${this.workerId} stdout:`,
        data.toString().trim(),
      )
    })

    this.process.stderr?.on("data", (data) => {
      this.logger.error(
        `Worker ${this.workerId} stderr:`,
        data.toString().trim(),
      )
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

  sendJob(job: WorkerJob): void {
    if (this.process && this.process.send) {
      this.process.send(job)
    } else {
      this.logger.error(
        `Cannot send job to worker ${this.workerId}: process not available`,
      )
    }
  }
}

export const createWorkerManager = (serverApp: ServerApp): WorkerManager => {
  const logger = serverApp.createLogger("worker-manager")
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

  return {
    submitJob: async (job: WorkerJob) => {
      // Simple round-robin job distribution
      const workerIndex = Math.floor(Math.random() * workers.length)
      const worker = workers[workerIndex]

      if (worker) {
        logger.debug(`Submitting job ${job.id} to worker ${workerIndex + 1}`)
        worker.sendJob(job)
      } else {
        logger.error(`No worker available at index ${workerIndex}`)
      }
    },

    getWorkerCount: () => workers.length,

    shutdown: async () => {
      logger.info("Shutting down all workers...")
      await Promise.all(workers.map((worker) => worker.shutdown()))
      logger.info("All workers shut down")
    },
  }
}
