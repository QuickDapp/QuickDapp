/**
 * Database test helpers for QuickDapp
 *
 * Utilities for managing test database lifecycle,
 * creating test data, and cleaning up between tests.
 */

// Side-effect import: sets env vars before serverConfig loads
import "@tests/helpers/test-config"

import { dbManager, schema } from "@server/db/connection"
import type {
  NewNotification,
  NewUser,
  NewWorkerJob,
  User,
} from "@server/db/schema"
import { testLogger } from "@tests/helpers/logger"
import {
  getTestDatabaseName,
  getTestDatabaseUrl,
} from "@tests/helpers/test-config"
import { sql } from "drizzle-orm"
import postgres from "postgres"

const ADMIN_DATABASE_URL = "postgresql://postgres@localhost:55433/postgres"

/**
 * Initialize the shared test database connection
 * Uses the centralized connection manager to prevent pool exhaustion
 */
export async function initTestDb() {
  const databaseUrl = getTestDatabaseUrl()
  testLogger.info(
    `🔌 Initializing test database connection to: ${getTestDatabaseName()}`,
  )

  // Use the centralized connection manager with test-specific settings
  const db = await dbManager.connect({
    maxConnections: 1, // Very low limit for tests to prevent pool exhaustion
    idleTimeout: 0, // Never timeout in tests
    connectTimeout: 10,
    databaseUrl,
  })

  testLogger.info("✅ Test database connection established")
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
    await db.execute(sql`TRUNCATE TABLE user_auth RESTART IDENTITY CASCADE`)

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
    await db.execute(sql`ALTER SEQUENCE user_auth_id_seq RESTART WITH 1`)
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
    await createTestUser()
    await createTestUser()

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
  userData: { settings?: any; disabled?: boolean } = {},
): Promise<User> {
  const defaultUser: NewUser = {
    settings: { theme: "dark" },
    disabled: false,
    ...userData,
  }

  const db = getTestDb()
  const [user] = await db.insert(schema.users).values(defaultUser).returning()

  if (!user) {
    throw new Error("Failed to create test user")
  }

  testLogger.info("📝 Test user created:", { id: user.id })

  return user
}

/**
 * Set user disabled status
 */
export async function setTestUserDisabled(
  userId: number,
  disabled: boolean,
): Promise<void> {
  const db = getTestDb()
  await db
    .update(schema.users)
    .set({ disabled, updatedAt: new Date() })
    .where(sql`id = ${userId}`)

  testLogger.info("📝 Test user disabled status updated:", { userId, disabled })
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
  jobData: {
    tag?: string
    type: string
    userId: number
    data: any
    due?: Date
  } = {
    type: "testJob",
    userId: 1,
    data: { action: "test" },
  },
): Promise<any> {
  const tag = jobData.tag || `test:${Date.now()}-${Math.random()}`
  const defaultJob: NewWorkerJob = {
    tag,
    due: new Date(),
    removeAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
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

/**
 * Create the test database from template
 * Called at the start of each test file in parallel execution
 * Uses retry logic with exponential backoff because PostgreSQL requires
 * exclusive lock on template during cloning - concurrent attempts may fail
 */
export async function createTestDatabaseFromTemplate(): Promise<void> {
  const dbName = getTestDatabaseName()
  const maxRetries = 10
  const baseDelayMs = 100

  testLogger.info(`📦 Creating test database from template: ${dbName}`)

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const adminClient = postgres(ADMIN_DATABASE_URL, { max: 1 })

    try {
      // Drop database if it exists (from previous failed run)
      await adminClient.unsafe(`DROP DATABASE IF EXISTS ${dbName}`)

      // Create database from template
      await adminClient.unsafe(
        `CREATE DATABASE ${dbName} WITH TEMPLATE quickdapp_test OWNER postgres`,
      )

      testLogger.info(`✅ Created test database: ${dbName}`)
      return
    } catch (error: any) {
      const isTemplateLockError =
        error?.message?.includes("being accessed by other users") ||
        error?.message?.includes("source database")

      if (isTemplateLockError && attempt < maxRetries) {
        // Exponential backoff with jitter for template lock contention
        const delayMs =
          baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 100
        testLogger.info(
          `⏳ Template locked, retrying in ${Math.round(delayMs)}ms (attempt ${attempt}/${maxRetries})`,
        )
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      } else {
        testLogger.error(`❌ Failed to create test database ${dbName}:`, error)
        throw error
      }
    } finally {
      await adminClient.end()
    }
  }

  throw new Error(
    `Failed to create test database ${dbName} after ${maxRetries} attempts`,
  )
}

/**
 * Drop the test database after tests complete
 * Called at the end of each test file in parallel execution
 */
export async function dropTestDatabase(): Promise<void> {
  const dbName = getTestDatabaseName()

  testLogger.info(`🗑️ Dropping test database: ${dbName}`)

  // First disconnect from the database
  await closeTestDb()

  const adminClient = postgres(ADMIN_DATABASE_URL, { max: 1 })

  try {
    // Terminate any remaining connections to the database
    await adminClient.unsafe(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${dbName}'
        AND pid <> pg_backend_pid()
    `)

    // Drop the database
    await adminClient.unsafe(`DROP DATABASE IF EXISTS ${dbName}`)

    testLogger.info(`✅ Dropped test database: ${dbName}`)
  } finally {
    await adminClient.end()
  }
}

/**
 * Mark quickdapp_test as a template database
 * Called once after db push in test.ts
 */
export async function markDatabaseAsTemplate(): Promise<void> {
  testLogger.info("📋 Marking quickdapp_test as template database...")

  const adminClient = postgres(ADMIN_DATABASE_URL, { max: 1 })

  try {
    // Terminate any connections to the template database
    await adminClient.unsafe(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'quickdapp_test'
        AND pid <> pg_backend_pid()
    `)

    // Mark as template (must use WITH keyword for options)
    await adminClient.unsafe(
      `ALTER DATABASE quickdapp_test WITH IS_TEMPLATE = true`,
    )

    testLogger.info("✅ quickdapp_test marked as template database")
  } finally {
    await adminClient.end()
  }
}

/**
 * Unmark quickdapp_test as a template
 * Called at the end of test.ts for cleanup
 */
export async function unmarkDatabaseAsTemplate(): Promise<void> {
  testLogger.info("📋 Unmarking quickdapp_test as template database...")

  const adminClient = postgres(ADMIN_DATABASE_URL, { max: 1 })

  try {
    await adminClient.unsafe(
      `ALTER DATABASE quickdapp_test WITH IS_TEMPLATE = false`,
    )
    testLogger.info("✅ quickdapp_test unmarked as template database")
  } finally {
    await adminClient.end()
  }
}
