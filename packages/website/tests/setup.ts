/**
 * Global test setup and teardown
 * Manages database connections and ensures proper cleanup
 */

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

beforeAll(async () => {
  const config = await getTestConfig()
  testLogger.info(
    `🚀 Global test setup starting (index: ${config.TEST_FILE_INDEX}, db: ${config.DATABASE_NAME}, port: ${config.PORT})`,
  )

  try {
    await createTestDatabaseFromTemplate()
    await initTestDb()
    testLogger.info("✅ Global test database initialized")

    const stats = dbManager.getConnectionStats()
    testLogger.info("📊 Database connection stats:", stats)
  } catch (error) {
    testLogger.error("❌ Global test setup failed:", error)
    throw error
  }
})

afterAll(async () => {
  const config = await getTestConfig()
  testLogger.info(
    `🧹 Global test teardown starting (index: ${config.TEST_FILE_INDEX})`,
  )

  try {
    killAllActiveWorkers()
    await dropTestDatabase()
    testLogger.info("✅ Global test cleanup complete")
  } catch (error) {
    testLogger.error("❌ Global test teardown failed:", error)
  }
})

export const getConnectionStats = () => dbManager.getConnectionStats()
export const isDbConnected = () => dbManager.isConnectionActive()
