import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test"
import { eq, inArray } from "drizzle-orm"
import { workerJobs } from "../../../src/server/db/schema"
import { removeOldJobs, scheduleJob } from "../../../src/server/db/worker"
import type { BlockchainTestContext } from "../../helpers/blockchain"
import {
  cleanupBlockchainTestContext,
  createBlockchainTestContext,
} from "../../helpers/blockchain"
import { cleanTestDatabase, setupTestDatabase } from "../../helpers/database"
import { testLogger } from "../../helpers/logger"
import type { TestServer } from "../../helpers/server"
import { startTestServer, waitForServer } from "../../helpers/server"
import type { TestWorkerContext } from "../../helpers/worker"
import { startTestWorker, stopTestWorker } from "../../helpers/worker"
// Import global test setup
import "../../setup"

describe("Worker Database Cleanup", () => {
  let blockchainContext: BlockchainTestContext
  let serverContext: TestServer
  let workerContext: TestWorkerContext

  beforeAll(async () => {
    try {
      testLogger.info("🔧 Setting up worker database cleanup tests...")

      // Setup test database
      await setupTestDatabase()

      // Start Anvil blockchain instance for deployMulticall3 job
      testLogger.info("🔗 Starting test blockchain...")
      blockchainContext = await createBlockchainTestContext()
      testLogger.info(
        `✅ Test blockchain started at ${blockchainContext.anvil.url}`,
      )

      // Start test server
      serverContext = await startTestServer()
      await waitForServer(serverContext.url)

      // Create and start test worker
      workerContext = await startTestWorker()

      testLogger.info("✅ Worker database cleanup test setup complete")
    } catch (error) {
      testLogger.error("❌ Worker database cleanup test setup failed:", error)
      throw error
    }
  })

  beforeEach(async () => {
    // Clean database before each test
    await cleanTestDatabase()
  })

  afterEach(async () => {
    // Clean database after each test
    await cleanTestDatabase()
  })

  afterAll(async () => {
    try {
      testLogger.info("🧹 Cleaning up worker database cleanup tests...")

      // Stop worker
      await stopTestWorker(workerContext)

      // Shutdown server
      await serverContext.shutdown()

      // Cleanup blockchain
      await cleanupBlockchainTestContext(blockchainContext)

      testLogger.info("✅ Worker database cleanup test cleanup complete")
    } catch (error) {
      testLogger.error("❌ Worker database cleanup test cleanup failed:", error)
    }
  })

  test("should remove old completed jobs", async () => {
    // Create and complete several old jobs
    const oldJobIds: number[] = []

    for (let i = 0; i < 3; i++) {
      const job = await scheduleJob(serverContext.serverApp, {
        type: "removeOldWorkerJobs",
        userId: i,
        removeDelay: -1000, // Already expired
      })
      oldJobIds.push(job.id)
    }

    // Mark all as completed and set removeAt to past date
    const pastDate = new Date(Date.now() - 2000) // 2 seconds ago
    for (const jobId of oldJobIds) {
      await serverContext.serverApp.db
        .update(workerJobs)
        .set({
          started: new Date(),
          finished: new Date(),
          success: true,
          removeAt: pastDate, // Mark for removal
        })
        .where(eq(workerJobs.id, jobId))
    }

    // Verify jobs exist before cleanup
    const jobsBeforeCleanup = await serverContext.serverApp.db
      .select()
      .from(workerJobs)
      .where(inArray(workerJobs.id, oldJobIds))
    expect(jobsBeforeCleanup).toHaveLength(3)

    // Run cleanup
    await removeOldJobs(serverContext.serverApp, { exclude: [] })

    // Verify jobs are actually removed
    const remainingJobs = await serverContext.serverApp.db
      .select()
      .from(workerJobs)
      .where(inArray(workerJobs.id, oldJobIds))
    expect(remainingJobs).toHaveLength(0)
  })
})
