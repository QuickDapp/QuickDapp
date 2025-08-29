/**
 * Database test helpers for QuickDapp v3
 *
 * Utilities for managing test database lifecycle,
 * creating test data, and cleaning up between tests.
 */

import { sql } from "drizzle-orm"
import { dbManager, schema } from "../../src/server/db/connection"
import type {
  NewNotification,
  NewUser,
  NewWorkerJob,
  User,
} from "../../src/server/db/schema"
import { serverConfig } from "../../src/shared/config/server"
import { testLogger } from "./logger"

/**
 * Initialize the shared test database connection
 * Uses the centralized connection manager to prevent pool exhaustion
 */
export async function initTestDb() {
  testLogger.info("🔌 Initializing shared test database connection...")

  if (!serverConfig.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL configuration is required for test database connection",
    )
  }

  // Use the centralized connection manager with test-specific settings
  const db = await dbManager.connect({
    maxConnections: 1, // Very low limit for tests to prevent pool exhaustion
    idleTimeout: 0, // Never timeout in tests
    connectTimeout: 10,
    databaseUrl: serverConfig.DATABASE_URL,
  })

  testLogger.info("✅ Shared test database connection established")
  return db
}

/**
 * Get the shared test database connection
 */
function getTestDb() {
  if (!dbManager.isConnectionActive()) {
    throw new Error("Test database not initialized. Call initTestDb() first.")
  }
  return dbManager.getDb()
}

/**
 * Close test database connection
 */
export async function closeTestDb() {
  await dbManager.disconnect()
}

/**
 * Clean test database
 * Removes all data but keeps schema by truncating tables in correct order
 */
export async function cleanTestDatabase(): Promise<void> {
  testLogger.info("🧹 Cleaning test database...")

  try {
    const db = getTestDb()

    // Truncate tables in reverse dependency order to respect foreign keys
    // Start with tables that reference others, then the tables they reference

    // First: Tables that reference other tables
    await db.execute(sql`TRUNCATE TABLE notifications RESTART IDENTITY CASCADE`)
    await db.execute(sql`TRUNCATE TABLE worker_jobs RESTART IDENTITY CASCADE`)

    // Then: Tables that are referenced by others
    await db.execute(sql`TRUNCATE TABLE users RESTART IDENTITY CASCADE`)

    // Finally: Independent tables
    await db.execute(sql`TRUNCATE TABLE settings RESTART IDENTITY CASCADE`)

    testLogger.info("✅ Test database cleaned")
  } catch (error) {
    testLogger.error("❌ Test database cleaning failed:", error)
    throw error
  }
}

/**
 * Reset test database sequences
 * Ensures auto-increment IDs start from 1 for consistent tests
 */
export async function resetTestDatabaseSequences(): Promise<void> {
  testLogger.info("🔄 Resetting test database sequences...")

  try {
    const db = getTestDb()

    // Reset all sequence counters to start from 1
    await db.execute(sql`ALTER SEQUENCE settings_id_seq RESTART WITH 1`)
    await db.execute(sql`ALTER SEQUENCE users_id_seq RESTART WITH 1`)
    await db.execute(sql`ALTER SEQUENCE notifications_id_seq RESTART WITH 1`)
    await db.execute(sql`ALTER SEQUENCE worker_jobs_id_seq RESTART WITH 1`)

    testLogger.info("✅ Test database sequences reset")
  } catch (error) {
    testLogger.error("❌ Test database sequence reset failed:", error)
    throw error
  }
}

/**
 * Setup test database
 * Ensures database is clean and ready for tests
 * Note: Global setup handles connection initialization
 */
export async function setupTestDatabase(): Promise<void> {
  testLogger.info("📦 Setting up test database...")

  try {
    // Ensure connection is active (singleton will reuse existing connection if available)
    if (!dbManager.isConnectionActive()) {
      testLogger.info("Database not connected, initializing...")
      await initTestDb()
    } else {
      testLogger.info("✅ Using existing database connection")
    }

    // Clean all data between tests
    await cleanTestDatabase()

    // Reset sequences for consistent test IDs
    await resetTestDatabaseSequences()

    testLogger.info("✅ Test database setup complete")
  } catch (error) {
    testLogger.error("❌ Test database setup failed:", error)
    throw error
  }
}

/**
 * Seed test database with initial data
 */
export async function seedTestDatabase(): Promise<void> {
  testLogger.info("🌱 Seeding test database...")

  try {
    // Create some basic test users
    await createTestUser({
      wallet: "0x742d35Cc6634C0532925a3b8D39A6Fa678e88CfD",
    })
    await createTestUser({
      wallet: "0x8ba1f109551bD432803012645Hac136c30C8A4E4",
    })

    testLogger.info("✅ Test database seeded")
  } catch (error) {
    testLogger.error("❌ Test database seeding failed:", error)
    throw error
  }
}

/**
 * Create test user
 */
export async function createTestUser(
  userData: { wallet?: string; settings?: any } = {},
): Promise<User> {
  const defaultUser: NewUser = {
    wallet: "0x742d35Cc6634C0532925a3b8D39A6Fa678e88CfD",
    settings: { theme: "dark" },
    ...userData,
  }

  const db = getTestDb()
  const [user] = await db.insert(schema.users).values(defaultUser).returning()

  if (!user) {
    throw new Error("Failed to create test user")
  }

  testLogger.info("📝 Test user created:", { id: user.id, wallet: user.wallet })
  return user
}

/**
 * Create test notification
 */
export async function createTestNotification(
  notificationData: { userId: number; data: any; read?: boolean } = {
    userId: 1,
    data: { message: "Test notification" },
  },
): Promise<any> {
  const defaultNotification: NewNotification = {
    read: false,
    ...notificationData,
  }

  const db = getTestDb()
  const [notification] = await db
    .insert(schema.notifications)
    .values(defaultNotification)
    .returning()

  if (!notification) {
    throw new Error("Failed to create test notification")
  }

  testLogger.info("📝 Test notification created:", {
    id: notification.id,
    userId: notification.userId,
  })
  return notification
}

/**
 * Create test worker job
 */
export async function createTestWorkerJob(
  jobData: { type: string; userId: number; data: any; due?: Date } = {
    type: "testJob",
    userId: 1,
    data: { action: "test" },
  },
): Promise<any> {
  const defaultJob: NewWorkerJob = {
    due: new Date(),
    removeAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    ...jobData,
  }

  const db = getTestDb()
  const [job] = await db
    .insert(schema.workerJobs)
    .values(defaultJob)
    .returning()

  if (!job) {
    throw new Error("Failed to create test worker job")
  }

  testLogger.info("📝 Test worker job created:", {
    id: job.id,
    type: job.type,
    userId: job.userId,
  })
  return job
}

/**
 * Get test database statistics
 * Useful for verifying database state during tests
 */
export async function getTestDatabaseStats(): Promise<{
  users: number
  notifications: number
  workerJobs: number
  settings: number
}> {
  const db = getTestDb()

  const [userCount] = await db.execute(sql`SELECT COUNT(*) as count FROM users`)
  const [notificationCount] = await db.execute(
    sql`SELECT COUNT(*) as count FROM notifications`,
  )
  const [jobCount] = await db.execute(
    sql`SELECT COUNT(*) as count FROM worker_jobs`,
  )
  const [settingCount] = await db.execute(
    sql`SELECT COUNT(*) as count FROM settings`,
  )

  return {
    users: userCount ? Number(userCount.count) : 0,
    notifications: notificationCount ? Number(notificationCount.count) : 0,
    workerJobs: jobCount ? Number(jobCount.count) : 0,
    settings: settingCount ? Number(settingCount.count) : 0,
  }
}

/**
 * Verify test database is empty
 * Useful for test cleanup verification
 */
export async function verifyTestDatabaseIsEmpty(): Promise<boolean> {
  const stats = await getTestDatabaseStats()
  return (
    stats.users === 0 &&
    stats.notifications === 0 &&
    stats.workerJobs === 0 &&
    stats.settings === 0
  )
}
