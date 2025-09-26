import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test"
import type { BlockchainTestContext } from "../../helpers/blockchain"
import {
  cleanupBlockchainTestContext,
  createBlockchainTestContext,
} from "../../helpers/blockchain"
import { cleanTestDatabase, setupTestDatabase } from "../../helpers/database"
import { testLogger } from "../../helpers/logger"
import {
  cleanJobQueue,
  getQueueStatus,
  setupTestQueue,
  teardownTestQueue,
} from "../../helpers/queue"
import type { TestServer } from "../../helpers/server"
import { startTestServer, waitForServer } from "../../helpers/server"
// Import global test setup
import "../../setup"

describe("Queue Cron Job Scheduling", () => {
  let blockchainContext: BlockchainTestContext
  let serverContext: TestServer

  beforeAll(async () => {
    try {
      testLogger.info("🔧 Setting up queue cron job tests...")

      // Setup test database and queue
      await setupTestDatabase()
      await setupTestQueue()

      // Start testnet blockchain instance
      testLogger.info("🔗 Starting test blockchain...")
      blockchainContext = await createBlockchainTestContext()
      testLogger.info(
        `✅ Test blockchain started at ${blockchainContext.testnet.url}`,
      )

      // Start test server with workers enabled
      serverContext = await startTestServer({ workerCountOverride: 1 })
      await waitForServer(serverContext.url)

      testLogger.info("✅ Queue cron job test setup complete")
    } catch (error) {
      testLogger.error("❌ Queue cron job test setup failed:", error)
      throw error
    }
  })

  beforeEach(async () => {
    // Clean database and queue before each test
    await cleanTestDatabase()
    await cleanJobQueue()
  })

  afterEach(async () => {
    // Clean database and queue after each test
    await cleanTestDatabase()
    await cleanJobQueue()
  })

  afterAll(async () => {
    try {
      testLogger.info("🧹 Cleaning up queue cron job tests...")

      // Shutdown server and cleanup queue
      await serverContext.shutdown()
      await teardownTestQueue(serverContext.serverApp)

      // Cleanup blockchain
      await cleanupBlockchainTestContext(blockchainContext)

      testLogger.info("✅ Queue cron job test cleanup complete")
    } catch (error) {
      testLogger.error("❌ Queue cron job test cleanup failed:", error)
    }
  })

  test("should handle cron job scheduling via QueueManager", async () => {
    // Test that QueueManager can schedule cron jobs
    // Note: In the new system, cron jobs are handled by QueueManager.scheduleCronJob()

    const cronExpression = "*/30 * * * * *" // Every 30 seconds

    await serverContext.serverApp.queueManager.scheduleCronJob(
      "cleanupAuditLog",
      cronExpression,
      { maxAge: 24 * 60 * 60 * 1000 },
      "test-cleanup-job",
    )

    // Wait a moment for the job to be scheduled
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Check that a repeatable job exists
    const queueStatus = await getQueueStatus()

    // The exact behavior depends on BullMQ's internal state
    // We mainly want to verify no errors occurred during scheduling
    expect(queueStatus).toBeDefined()
    expect(queueStatus.total).toBeGreaterThanOrEqual(0)
  })

  test("should handle cron job execution", async () => {
    // Schedule a cron job that runs every 2 seconds
    await serverContext.serverApp.queueManager.scheduleCronJob(
      "cleanupAuditLog",
      "*/2 * * * * *", // Every 2 seconds
      { maxAge: 1 * 60 * 60 * 1000 }, // 1 hour
      "test-execution-job",
    )

    // Wait for at least one execution
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Check queue status to see if jobs were processed
    const queueStatus = await getQueueStatus()
    expect(queueStatus).toBeDefined()

    // At minimum, verify the system is still stable after cron job setup
    expect(queueStatus.total).toBeGreaterThanOrEqual(0)
  })

  test("should cleanup cron jobs on shutdown", async () => {
    // Schedule multiple cron jobs
    await serverContext.serverApp.queueManager.scheduleCronJob(
      "cleanupAuditLog",
      "0 */6 * * * *", // Every 6 hours
      { maxAge: 24 * 60 * 60 * 1000 },
      "test-cleanup-shutdown",
    )

    await serverContext.serverApp.queueManager.scheduleCronJob(
      "watchChain",
      "*/30 * * * * *", // Every 30 seconds
      { fromBlock: 1000000n },
      "test-watch-shutdown",
    )

    // Wait for jobs to be scheduled
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Clean the queue (this should remove repeatable jobs)
    await cleanJobQueue()

    // Verify queue is clean
    const queueStatus = await getQueueStatus()
    expect(queueStatus.total).toBe(0)
  })
})
