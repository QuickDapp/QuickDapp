/**
 * Global test setup and teardown
 * Manages database connections and ensures proper cleanup
 */

import { afterAll, beforeAll } from "bun:test"
import { dbManager } from "../src/server/db/connection"
import { closeTestDb, initTestDb } from "./helpers/database"

// Global test setup - runs once before all tests
beforeAll(async () => {
  console.log("🚀 Global test setup starting...")

  try {
    // Initialize shared test database connection
    await initTestDb()
    console.log("✅ Global test database initialized")

    // Log connection stats for debugging
    const stats = dbManager.getConnectionStats()
    console.log("📊 Database connection stats:", stats)
  } catch (error) {
    console.error("❌ Global test setup failed:", error)
    throw error
  }
})

// Global test teardown - runs once after all tests
afterAll(async () => {
  console.log("🧹 Global test teardown starting...")

  try {
    // Close all database connections
    await closeTestDb()
    console.log("✅ Global test database cleanup complete")
  } catch (error) {
    console.error("❌ Global test teardown failed:", error)
    // Don't throw here to avoid masking test failures
  }
})

// Export connection monitoring utilities for tests
export const getConnectionStats = () => dbManager.getConnectionStats()
export const isDbConnected = () => dbManager.isConnectionActive()
