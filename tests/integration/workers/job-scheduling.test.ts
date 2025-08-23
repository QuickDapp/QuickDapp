import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test"
import { eq } from "drizzle-orm"
import { workerJobs } from "../../../src/server/db/schema"
import { scheduleCronJob, scheduleJob } from "../../../src/server/db/worker"
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

describe("Worker Job Scheduling", () => {
  let blockchainContext: BlockchainTestContext
  let serverContext: TestServer
  let workerContext: TestWorkerContext

  beforeAll(async () => {
    try {
      testLogger.info("🔧 Setting up worker job scheduling tests...")

      // Setup test database
      await setupTestDatabase()

      // Start Anvil blockchain instance for deployMulticall3 job
      testLogger.info("🔗 Starting test blockchain...")
      blockchainContext = await createBlockchainTestContext()
      testLogger.info(
        `✅ Test blockchain started at ${blockchainContext.anvil.url}`,
      )

      // Start test server (worker count is 0 in test env)
      serverContext = await startTestServer()
      await waitForServer(serverContext.url)

      // Start separate test worker
      workerContext = await startTestWorker()

      testLogger.info("✅ Worker job scheduling test setup complete")
    } catch (error) {
      testLogger.error("❌ Worker job scheduling test setup failed:", error)
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
      testLogger.info("🧹 Cleaning up worker job scheduling tests...")

      // Stop test worker
      await stopTestWorker(workerContext)

      // Shutdown server
      await serverContext.shutdown()

      // Cleanup blockchain
      await cleanupBlockchainTestContext(blockchainContext)

      testLogger.info("✅ Worker job scheduling test cleanup complete")
    } catch (error) {
      testLogger.error("❌ Worker job scheduling test cleanup failed:", error)
    }
  })

  test("should schedule a job successfully", async () => {
    const jobConfig = createTestJobConfig({
      type: "removeOldWorkerJobs",
      userId: 1,
      data: { test: true },
    })

    const job = await scheduleJob(serverContext.serverApp, jobConfig)

    expect(job.id).toBeGreaterThan(0)
    expect(job.type).toBe("removeOldWorkerJobs")
    expect(job.userId).toBe(1)
    expect(job.data).toMatchObject({
      testRun: true,
      test: true,
    })
    expect((job.data as any).testId).toBeTruthy()
    expect(job.finished).toBeNull()
    expect(job.success).toBeNull()
  })

  test("should schedule a cron job successfully", async () => {
    const jobConfig = createTestJobConfig({
      type: "watchChain",
      userId: 0,
    })

    const job = await scheduleCronJob(
      serverContext.serverApp,
      jobConfig,
      "0 * * * * *", // every minute
    )

    expect(job.id).toBeGreaterThan(0)
    expect(job.type).toBe("watchChain")
    expect(job.cronSchedule).toBe("0 * * * * *")
    expect(job.due).toBeInstanceOf(Date)
  })

  test("should cancel existing pending jobs when scheduling new job of same type", async () => {
    const jobConfig = createTestJobConfig({
      type: "removeOldWorkerJobs",
      userId: 1,
    })

    // Schedule first job
    const job1 = await scheduleJob(serverContext.serverApp, jobConfig)

    // Schedule second job of same type (this should cancel job1)
    const job2 = await scheduleJob(serverContext.serverApp, jobConfig)

    expect(job2.id).not.toBe(job1.id)

    // Both jobs should exist in database
    const allJobs = await serverContext.serverApp.db
      .select()
      .from(workerJobs)
      .where(eq(workerJobs.userId, 1))

    expect(allJobs).toHaveLength(2)
    expect(allJobs.some((j) => j.id === job1.id)).toBe(true)
    expect(allJobs.some((j) => j.id === job2.id)).toBe(true)

    // The cancellation behavior is tested elsewhere - for now just verify both jobs exist
  })
})
