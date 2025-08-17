import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import type { Elysia } from "elysia"
import type * as schema from "./db/schema"
import type { createLogger, Logger } from "./lib/logger"
import type { WorkerManager } from "./workers"

/**
 * ServerApp type containing references to useful properties and methods
 * that get passed around the application
 */
export type ServerApp = {
  /** The server application instance */
  app: Elysia
  /** Database instance */
  db: PostgresJsDatabase<typeof schema>
  /** Root logger instance */
  rootLogger: Logger
  /** Create a logger with a category */
  createLogger: typeof createLogger
  /** Worker manager for background job processing */
  workerManager: WorkerManager
}
