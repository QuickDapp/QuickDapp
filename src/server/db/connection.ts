import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { serverConfig } from "../../shared/config/env"
import { createLogger } from "../lib/logger"
import * as schema from "./schema"

const logger = createLogger("database")

let db: ReturnType<typeof drizzle> | null = null
let client: postgres.Sql | null = null

export const connectDb = async () => {
  try {
    logger.debug("Connecting to database...")

    // Create postgres client
    client = postgres(serverConfig.DATABASE_URL, {
      max: 10, // Maximum number of connections
      idle_timeout: 20, // Close idle connections after 20 seconds
      connect_timeout: 10, // Connection timeout in seconds
    })

    // Create drizzle instance
    db = drizzle(client, { schema })

    // Test the connection
    await client`SELECT 1 as test`

    logger.info("Database connection established")
  } catch (error) {
    logger.error("Failed to connect to database:", error)
    throw error
  }
}

export const disconnectDb = async () => {
  try {
    if (client) {
      logger.debug("Disconnecting from database...")
      await client.end()
      client = null
      db = null
      logger.info("Database disconnected")
    }
  } catch (error) {
    logger.error("Error disconnecting from database:", error)
    throw error
  }
}

export const getDb = () => {
  if (!db) {
    throw new Error("Database not connected. Call connectDb() first.")
  }
  return db
}

export { schema }
