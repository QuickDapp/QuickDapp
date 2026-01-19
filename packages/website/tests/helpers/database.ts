/**
 * Database test helpers for QuickDapp Website
 *
 * Utilities for managing test database lifecycle,
 * creating test data, and cleaning up between tests.
 *
 * Simplified for website schema (settings and worker_jobs only)
 */

import "@tests/helpers/test-config"

import { dbManager, schema } from "@server/db/connection"
import type { NewWorkerJob, WorkerJob } from "@server/db/schema"
import { testLogger } from "@tests/helpers/logger"
import {
  getTestDatabaseName,
  getTestDatabaseUrl,
} from "@tests/helpers/test-config"
import { sql } from "drizzle-orm"
import postgres from "postgres"

const ADMIN_DATABASE_URL = "postgresql://postgres@localhost:55434/postgres"

/**
 * Initialize the shared test database connection
 * Uses the centralized connection manager to prevent pool exhaustion
 */
export async function initTestDb() {
  const databaseUrl = getTestDatabaseUrl()
  testLogger.info(
    `🔌 Initializing test database connection to: ${getTestDatabaseName()}`,
  )

  const db = await dbManager.connect({
    maxConnections: 1,
    idleTimeout: 0,
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
 * Removes all data but keeps schema by truncating tables
 */
export async function cleanTestDatabase(): Promise<void> {
  testLogger.info("🧹 Cleaning test database...")

  try {
    const db = getTestDb()

    await db.execute(sql`TRUNCATE TABLE worker_jobs RESTART IDENTITY CASCADE`)
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

    await db.execute(sql`ALTER SEQUENCE settings_id_seq RESTART WITH 1`)
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
 */
export async function setupTestDatabase(): Promise<void> {
  testLogger.info("📦 Setting up test database...")

  try {
    if (!dbManager.isConnectionActive()) {
      testLogger.info("Database not connected, initializing...")
      await initTestDb()
    } else {
      testLogger.info("✅ Using existing database connection")
    }

    await cleanTestDatabase()
    await resetTestDatabaseSequences()

    testLogger.info("✅ Test database setup complete")
  } catch (error) {
    testLogger.error("❌ Test database setup failed:", error)
    throw error
  }
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
): Promise<WorkerJob> {
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
 */
export async function getTestDatabaseStats(): Promise<{
  workerJobs: number
  settings: number
}> {
  const db = getTestDb()

  const [jobCount] = await db.execute(
    sql`SELECT COUNT(*) as count FROM worker_jobs`,
  )
  const [settingCount] = await db.execute(
    sql`SELECT COUNT(*) as count FROM settings`,
  )

  return {
    workerJobs: jobCount ? Number(jobCount.count) : 0,
    settings: settingCount ? Number(settingCount.count) : 0,
  }
}

/**
 * Verify test database is empty
 */
export async function verifyTestDatabaseIsEmpty(): Promise<boolean> {
  const stats = await getTestDatabaseStats()
  return stats.workerJobs === 0 && stats.settings === 0
}

/**
 * Create the test database from template
 * Called at the start of each test file in parallel execution
 */
export async function createTestDatabaseFromTemplate(): Promise<void> {
  const dbName = getTestDatabaseName()
  const maxRetries = 10
  const baseDelayMs = 100

  testLogger.info(`📦 Creating test database from template: ${dbName}`)

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const adminClient = postgres(ADMIN_DATABASE_URL, { max: 1 })

    try {
      await adminClient.unsafe(`DROP DATABASE IF EXISTS ${dbName}`)

      await adminClient.unsafe(
        `CREATE DATABASE ${dbName} WITH TEMPLATE quickdapp_website_test OWNER postgres`,
      )

      testLogger.info(`✅ Created test database: ${dbName}`)
      return
    } catch (error: any) {
      const isTemplateLockError =
        error?.message?.includes("being accessed by other users") ||
        error?.message?.includes("source database")

      if (isTemplateLockError && attempt < maxRetries) {
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
 */
export async function dropTestDatabase(): Promise<void> {
  const dbName = getTestDatabaseName()

  testLogger.info(`🗑️ Dropping test database: ${dbName}`)

  await closeTestDb()

  const adminClient = postgres(ADMIN_DATABASE_URL, { max: 1 })

  try {
    await adminClient.unsafe(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${dbName}'
        AND pid <> pg_backend_pid()
    `)

    await adminClient.unsafe(`DROP DATABASE IF EXISTS ${dbName}`)

    testLogger.info(`✅ Dropped test database: ${dbName}`)
  } finally {
    await adminClient.end()
  }
}

/**
 * Mark quickdapp_website_test as a template database
 */
export async function markDatabaseAsTemplate(): Promise<void> {
  testLogger.info("📋 Marking quickdapp_website_test as template database...")

  const adminClient = postgres(ADMIN_DATABASE_URL, { max: 1 })

  try {
    await adminClient.unsafe(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'quickdapp_website_test'
        AND pid <> pg_backend_pid()
    `)

    await adminClient.unsafe(
      `ALTER DATABASE quickdapp_website_test WITH IS_TEMPLATE = true`,
    )

    testLogger.info("✅ quickdapp_website_test marked as template database")
  } finally {
    await adminClient.end()
  }
}

/**
 * Unmark quickdapp_website_test as a template
 */
export async function unmarkDatabaseAsTemplate(): Promise<void> {
  testLogger.info("📋 Unmarking quickdapp_website_test as template database...")

  const adminClient = postgres(ADMIN_DATABASE_URL, { max: 1 })

  try {
    await adminClient.unsafe(
      `ALTER DATABASE quickdapp_website_test WITH IS_TEMPLATE = false`,
    )
    testLogger.info("✅ quickdapp_website_test unmarked as template database")
  } finally {
    await adminClient.end()
  }
}
