import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test"
import {
  getTotalPendingJobs,
  scheduleCronJob,
} from "../../../src/server/db/worker"
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
import {
  createTestJobConfig,
  startTestWorker,
  stopTestWorker,
} from "../../helpers/worker"
// Import global test setup
import "../../setup"

describe("Worker Cron Job Scheduling", () => {
  let blockchainContext: BlockchainTestContext
  let serverContext: TestServer
  let workerContext: TestWorkerContext

  beforeAll(async () => {
    try {
      testLogger.info("🔧 Setting up worker cron job tests...")

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

      testLogger.info("✅ Worker cron job test setup complete")
    } catch (error) {
      testLogger.error("❌ Worker cron job test setup failed:", error)
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
      testLogger.info("🧹 Cleaning up worker cron job tests...")

      // Stop worker
      await stopTestWorker(workerContext)

      // Shutdown server
      await serverContext.shutdown()

      // Cleanup blockchain
      await cleanupBlockchainTestContext(blockchainContext)

      testLogger.info("✅ Worker cron job test cleanup complete")
    } catch (error) {
      testLogger.error("❌ Worker cron job test cleanup failed:", error)
    }
  })

  test("should reschedule cron job after execution", async () => {
    const jobConfig = createTestJobConfig({
      type: "removeOldWorkerJobs",
      userId: 0,
    })

    await scheduleCronJob(
      serverContext.serverApp,
      jobConfig,
      "*/5 * * * * *", // every 5 seconds
    )

    // Worker is already started in beforeEach

    // Wait longer than the job execution time
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Should have created a new job for the next cron execution
    const pendingCount = await getTotalPendingJobs(serverContext.serverApp)
    expect(pendingCount).toBeGreaterThanOrEqual(1)
  })
})
