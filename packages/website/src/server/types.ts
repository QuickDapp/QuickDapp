import type { Elysia } from "elysia"
import type { Database } from "./db/shared"
import type { Logger, startSpan } from "./lib/logger"
import type { WorkerManager } from "./workers"

export type ServerApp = {
  app: Elysia
  db: Database
  rootLogger: Logger
  createLogger: (category: string) => Logger
  startSpan: typeof startSpan
  workerManager: WorkerManager
}
