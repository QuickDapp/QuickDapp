/**
 * Queue test context helper to reduce boilerplate in queue tests
 *
 * Provides a standardized setup/teardown pattern for queue tests that need:
 * - Test database setup and cleanup
 * - Test queue setup and cleanup
 * - Test server with configurable worker count
 * - Automatic cleanup in proper order
 */

import { cleanTestDatabase, setupTestDatabase } from "./database"
import { testLogger } from "./logger"
import { cleanJobQueue, setupTestQueue, teardownTestQueue } from "./queue"
import type { TestServer } from "./server"
import { startTestServer, waitForServer } from "./server"

export interface QueueTestContextOptions {
  workerCount?: number
  skipDatabaseSetup?: boolean
  skipQueueSetup?: boolean
}

export interface QueueTestContext {
  server: TestServer
  cleanup: () => Promise<void>
}

/**
 * Create a complete queue test context with server, database, and queue setup
 */
export async function createQueueTestContext(
  options: QueueTestContextOptions = {},
): Promise<QueueTestContext> {
  const {
    workerCount = 1,
    skipDatabaseSetup = false,
    skipQueueSetup = false,
  } = options

  try {
    testLogger.info("🔧 Setting up queue test context...")

    // Setup database if not skipped
    if (!skipDatabaseSetup) {
      await setupTestDatabase()
    }

    // Setup queue if not skipped
    if (!skipQueueSetup) {
      await setupTestQueue()
    }

    // Start test server
    const server = await startTestServer({ workerCountOverride: workerCount })
    await waitForServer(server.url)

    testLogger.info("✅ Queue test context setup complete")

    // Return context with cleanup function
    return {
      server,
      cleanup: async () => {
        try {
          testLogger.info("🧹 Cleaning up queue test context...")

          // Shutdown server first
          await server.shutdown()

          // Cleanup queue if it was set up
          if (!skipQueueSetup) {
            await teardownTestQueue(server.serverApp)
          }

          // Add a small delay to allow Redis connections to close
          await new Promise((resolve) => setTimeout(resolve, 100))

          testLogger.info("✅ Queue test context cleanup complete")
        } catch (error) {
          testLogger.error("❌ Queue test context cleanup failed:", error)
        }
      },
    }
  } catch (error) {
    testLogger.error("❌ Queue test context setup failed:", error)
    throw error
  }
}

/**
 * Clean test data between test runs
 */
export async function cleanQueueTestData(): Promise<void> {
  await cleanTestDatabase()
  await cleanJobQueue()
}

/**
 * Standard beforeAll setup for queue tests
 */
export function createQueueTestSetup(options?: QueueTestContextOptions) {
  let context: QueueTestContext

  const beforeAll = async () => {
    context = await createQueueTestContext(options)
    return context
  }

  const afterAll = async () => {
    if (context) {
      await context.cleanup()
    }
  }

  const beforeEach = async () => {
    await cleanQueueTestData()
  }

  const afterEach = async () => {
    await cleanQueueTestData()
  }

  return {
    beforeAll,
    afterAll,
    beforeEach,
    afterEach,
    getContext: () => context,
  }
}
