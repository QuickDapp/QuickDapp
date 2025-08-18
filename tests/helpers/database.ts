/**
 * Database test helpers for QuickDapp v3
 * 
 * Utilities for managing test database lifecycle,
 * creating test data, and cleaning up between tests.
 */

import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { schema } from "../../src/server/db/connection"
import type { NewUser, NewNotification, NewWorkerJob, User } from "../../src/server/db/schema"

// Create a dedicated test database connection
let testDb: ReturnType<typeof drizzle> | null = null
let testClient: postgres.Sql | null = null

/**
 * Get or create test database connection
 */
function getTestDb() {
  if (!testDb) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required for test database connection')
    }
    
    // Create postgres client for tests
    testClient = postgres(process.env.DATABASE_URL, {
      max: 5, // Fewer connections for tests
      idle_timeout: 20,
      connect_timeout: 10,
    })
    
    // Create drizzle instance for tests
    testDb = drizzle(testClient, { schema })
  }
  
  return testDb
}

/**
 * Close test database connection
 */
export async function closeTestDb() {
  if (testClient) {
    await testClient.end()
    testClient = null
    testDb = null
  }
}

/**
 * Clean test database
 * Removes all data but keeps schema by truncating tables in correct order
 */
export async function cleanTestDatabase(): Promise<void> {
  console.log('🧹 Cleaning test database...')
  
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
    
    console.log('✅ Test database cleaned')
  } catch (error) {
    console.error('❌ Test database cleaning failed:', error)
    throw error
  }
}

/**
 * Reset test database sequences
 * Ensures auto-increment IDs start from 1 for consistent tests
 */
export async function resetTestDatabaseSequences(): Promise<void> {
  console.log('🔄 Resetting test database sequences...')
  
  try {
    const db = getTestDb()
    
    // Reset all sequence counters to start from 1
    await db.execute(sql`ALTER SEQUENCE settings_id_seq RESTART WITH 1`)
    await db.execute(sql`ALTER SEQUENCE users_id_seq RESTART WITH 1`)
    await db.execute(sql`ALTER SEQUENCE notifications_id_seq RESTART WITH 1`)
    await db.execute(sql`ALTER SEQUENCE worker_jobs_id_seq RESTART WITH 1`)
    
    console.log('✅ Test database sequences reset')
  } catch (error) {
    console.error('❌ Test database sequence reset failed:', error)
    throw error
  }
}

/**
 * Setup test database
 * Ensures database is clean and ready for tests
 */
export async function setupTestDatabase(): Promise<void> {
  console.log('📦 Setting up test database...')
  
  try {
    // Clean all data
    await cleanTestDatabase()
    
    // Reset sequences for consistent test IDs
    await resetTestDatabaseSequences()
    
    console.log('✅ Test database setup complete')
  } catch (error) {
    console.error('❌ Test database setup failed:', error)
    throw error
  }
}

/**
 * Seed test database with initial data
 */
export async function seedTestDatabase(): Promise<void> {
  console.log('🌱 Seeding test database...')
  
  try {
    // Create some basic test users
    await createTestUser({ wallet: '0x742d35Cc6634C0532925a3b8D39A6Fa678e88CfD' })
    await createTestUser({ wallet: '0x8ba1f109551bD432803012645Hac136c30C8A4E4' })
    
    console.log('✅ Test database seeded')
  } catch (error) {
    console.error('❌ Test database seeding failed:', error)
    throw error
  }
}

/**
 * Create test user
 */
export async function createTestUser(userData: {
  wallet?: string
  settings?: any
} = {}): Promise<User> {
  const defaultUser: NewUser = {
    wallet: '0x742d35Cc6634C0532925a3b8D39A6Fa678e88CfD',
    settings: { theme: 'dark' },
    ...userData,
  }
  
  const db = getTestDb()
  const [user] = await db.insert(schema.users).values(defaultUser).returning()
  
  if (!user) {
    throw new Error('Failed to create test user')
  }
  
  console.log('📝 Test user created:', { id: user.id, wallet: user.wallet })
  return user
}

/**
 * Create test notification
 */
export async function createTestNotification(notificationData: {
  userId: number
  data: any
  read?: boolean
} = { userId: 1, data: { message: 'Test notification' } }): Promise<any> {
  const defaultNotification: NewNotification = {
    read: false,
    ...notificationData,
  }
  
  const db = getTestDb()
  const [notification] = await db.insert(schema.notifications).values(defaultNotification).returning()
  
  if (!notification) {
    throw new Error('Failed to create test notification')
  }
  
  console.log('📝 Test notification created:', { id: notification.id, userId: notification.userId })
  return notification
}

/**
 * Create test worker job
 */
export async function createTestWorkerJob(jobData: {
  type: string
  userId: number
  data: any
  due?: Date
} = {
  type: 'testJob',
  userId: 1,
  data: { action: 'test' },
}): Promise<any> {
  const defaultJob: NewWorkerJob = {
    due: new Date(),
    removeAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    ...jobData,
  }
  
  const db = getTestDb()
  const [job] = await db.insert(schema.workerJobs).values(defaultJob).returning()
  
  if (!job) {
    throw new Error('Failed to create test worker job')
  }
  
  console.log('📝 Test worker job created:', { id: job.id, type: job.type, userId: job.userId })
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
  const [notificationCount] = await db.execute(sql`SELECT COUNT(*) as count FROM notifications`)
  const [jobCount] = await db.execute(sql`SELECT COUNT(*) as count FROM worker_jobs`)
  const [settingCount] = await db.execute(sql`SELECT COUNT(*) as count FROM settings`)
  
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
  return stats.users === 0 && 
         stats.notifications === 0 && 
         stats.workerJobs === 0 && 
         stats.settings === 0
}