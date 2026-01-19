import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { serverConfig } from "../../shared/config/server"
import { createDummyLogger, type Logger, startSpan } from "../lib/logger"
import * as schema from "./schema"
import type { Database } from "./shared"

let logger: Logger = createDummyLogger()

let globalDb: Database | null = null
let globalClient: postgres.Sql | null = null
let globalConnectionPromise: Promise<void> | null = null
let isGloballyConnected = false
let connectionAttemptCount = 0

class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager | null = null

  private constructor() {}

  static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager()
    }
    return DatabaseConnectionManager.instance
  }

  setLogger(newLogger: Logger): void {
    logger = newLogger
  }

  async connect(options?: {
    maxConnections?: number
    idleTimeout?: number
    connectTimeout?: number
    databaseUrl?: string
  }): Promise<Database> {
    if (isGloballyConnected && globalDb) {
      logger.debug("Reusing existing database connection")
      return globalDb
    }

    if (globalConnectionPromise) {
      logger.debug("Waiting for existing connection attempt")
      await globalConnectionPromise
      if (globalDb) {
        return globalDb
      }
    }

    const isTest = serverConfig.NODE_ENV === "test"
    if (isTest) {
      const finalOptions = {
        ...options,
        maxConnections: 3,
        idleTimeout: 0,
      }
      logger.debug(
        `Test mode: creating connection with max=${finalOptions.maxConnections}`,
      )
      globalConnectionPromise = this._createConnection(finalOptions)
    } else {
      globalConnectionPromise = this._createConnection(options)
    }

    await globalConnectionPromise

    if (!globalDb) {
      throw new Error("Failed to create database connection")
    }

    return globalDb
  }

  private async _createConnection(options?: {
    maxConnections?: number
    idleTimeout?: number
    connectTimeout?: number
    databaseUrl?: string
  }): Promise<void> {
    try {
      const databaseUrl = options?.databaseUrl || serverConfig.DATABASE_URL
      const isTest = serverConfig.NODE_ENV === "test"

      connectionAttemptCount++
      logger.debug(
        `Creating new database connection pool... (attempt #${connectionAttemptCount})`,
      )

      const isWorkerProcess = process.send !== undefined
      let maxConnections = options?.maxConnections

      if (!maxConnections) {
        if (isTest) {
          maxConnections = 1
        } else if (isWorkerProcess) {
          maxConnections = 2
        } else {
          maxConnections = 10
        }
      }

      globalClient = postgres(databaseUrl, {
        max: maxConnections,
        idle_timeout: options?.idleTimeout || (isTest ? 0 : 20),
        connect_timeout: options?.connectTimeout || 10,
        onnotice: (notice) => {
          logger.debug(notice)
        },
      })

      const baseDb = drizzle(globalClient, {
        schema,
        logger: {
          logQuery: (query, params) => {
            logger.debug(`Executing query: ${query}`, { params })
          },
        },
      })

      globalDb = Object.assign(baseDb, { startSpan }) as Database

      await globalClient`SELECT 1 as test`

      isGloballyConnected = true
      globalConnectionPromise = null

      logger.info(
        `Database connection established (max: ${globalClient.options.max} connections)`,
      )
    } catch (error) {
      globalConnectionPromise = null
      logger.error("Failed to connect to database:", error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (globalClient && isGloballyConnected) {
        logger.debug("Disconnecting from database...")
        await globalClient.end()
        globalClient = null
        globalDb = null
        isGloballyConnected = false
        logger.info("Database disconnected")
      }
    } catch (error) {
      logger.error("Error disconnecting from database:", error)
      throw error
    }
  }

  getDb(): Database {
    if (!isGloballyConnected || !globalDb) {
      throw new Error("Database not connected. Call connect() first.")
    }
    return globalDb
  }

  isConnectionActive(): boolean {
    return isGloballyConnected && globalDb !== null
  }

  getConnectionStats(): {
    isConnected: boolean
    maxConnections: number | null
    connectionAttempts: number
  } {
    return {
      isConnected: isGloballyConnected,
      maxConnections: globalClient?.options.max ?? null,
      connectionAttempts: connectionAttemptCount,
    }
  }
}

export const dbManager = DatabaseConnectionManager.getInstance()

export { schema }
