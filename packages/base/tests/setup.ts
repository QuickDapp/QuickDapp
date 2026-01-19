/**
 * Global test setup and teardown
 * Manages database connections and ensures proper cleanup
 */

// Side-effect import: sets env vars before serverConfig loads
import "./helpers/test-config"

import { afterAll, beforeAll } from "bun:test"
import { dbManager } from "../src/server/db/connection"
import {
  createTestDatabaseFromTemplate,
  dropTestDatabase,
  initTestDb,
} from "./helpers/database"
import { testLogger } from "./helpers/logger"
import { getTestConfig } from "./helpers/test-config"
import { killAllActiveWorkers } from "./helpers/worker"

// Global test setup - runs once before all tests
beforeAll(async () => {
  const config = await getTestConfig()
  testLogger.info(
    `🚀 Global test setup starting (index: ${config.TEST_FILE_INDEX}, db: ${config.DATABASE_NAME}, port: ${config.PORT})`,
  )

  try {
    // Create database from template (only for non-zero index in parallel execution)
    await createTestDatabaseFromTemplate()

    // Initialize shared test database connection
    await initTestDb()
    testLogger.info("✅ Global test database initialized")

    // Log connection stats for debugging
    const stats = dbManager.getConnectionStats()
    testLogger.info("📊 Database connection stats:", stats)
  } catch (error) {
    testLogger.error("❌ Global test setup failed:", error)
    throw error
  }
})

// Global test teardown - runs once after all tests
afterAll(async () => {
  const config = await getTestConfig()
  testLogger.info(
    `🧹 Global test teardown starting (index: ${config.TEST_FILE_INDEX})`,
  )

  try {
    // Kill any remaining worker processes
    killAllActiveWorkers()

    // Drop the test database (only for non-zero index in parallel execution)
    await dropTestDatabase()

    testLogger.info("✅ Global test cleanup complete")
  } catch (error) {
    testLogger.error("❌ Global test teardown failed:", error)
    // Don't throw here to avoid masking test failures
  }
})

// Export connection monitoring utilities for tests
export const getConnectionStats = () => dbManager.getConnectionStats()
export const isDbConnected = () => dbManager.isConnectionActive()
