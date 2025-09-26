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
import type { BlockchainTestContext } from "../../helpers/blockchain"
import {
  cleanupBlockchainTestContext,
  createBlockchainTestContext,
} from "../../helpers/blockchain"
import { cleanTestDatabase, setupTestDatabase } from "../../helpers/database"
import { testLogger } from "../../helpers/logger"
import {
  cleanJobQueue,
  setupTestQueue,
  submitTestJob,
  teardownTestQueue,
  waitForJob,
} from "../../helpers/queue"
import type { TestServer } from "../../helpers/server"
import { startTestServer, waitForServer } from "../../helpers/server"
// Import global test setup
import "../../setup"

describe("Queue Job Scheduling", () => {
  let blockchainContext: BlockchainTestContext
  let serverContext: TestServer

  beforeAll(async () => {
    try {
      testLogger.info("🔧 Setting up queue job scheduling tests...")

      // Setup test database and queue
      await setupTestDatabase()
      await setupTestQueue()

      // Start testnet blockchain instance for deployMulticall3 job
      testLogger.info("🔗 Starting test blockchain...")
      blockchainContext = await createBlockchainTestContext()
      testLogger.info(
        `✅ Test blockchain started at ${blockchainContext.testnet.url}`,
      )

      // Start test server (will include queue workers)
      serverContext = await startTestServer({ workerCountOverride: 1 })
      await waitForServer(serverContext.url)

      testLogger.info("✅ Queue job scheduling test setup complete")
    } catch (error) {
      testLogger.error("❌ Queue job scheduling test setup failed:", error)
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
      testLogger.info("🧹 Cleaning up queue job scheduling tests...")

      // Shutdown server and cleanup queue
      await serverContext.shutdown()
      await teardownTestQueue(serverContext.serverApp)

      // Cleanup blockchain
      await cleanupBlockchainTestContext(blockchainContext)

      testLogger.info("✅ Queue job scheduling test cleanup complete")
    } catch (error) {
      testLogger.error("❌ Queue job scheduling test cleanup failed:", error)
    }
  })

  test("should schedule a job successfully", async () => {
    const job = await submitTestJob(
      "cleanupAuditLog",
      { maxAge: 24 * 60 * 60 * 1000 },
      1,
    )

    expect(job.id).toBeTruthy()
    expect(job.name).toBe("cleanupAuditLog")
    expect(job.data.userId).toBe(1)
    expect(job.data.data).toMatchObject({
      maxAge: 24 * 60 * 60 * 1000,
    })
  })

  test("should wait for job completion and create audit record", async () => {
    const job = await submitTestJob(
      "cleanupAuditLog",
      { maxAge: 24 * 60 * 60 * 1000 },
      1,
    )

    // Wait for job to complete
    const result = await waitForJob(job.id!, 10000)
    expect(result).toBeDefined()

    // Check audit record was created
    const auditRecord = await serverContext.serverApp.db
      .select()
      .from(workerJobs)
      .where(eq(workerJobs.jobId, job.id!))
      .limit(1)

    expect(auditRecord).toHaveLength(1)
    expect(auditRecord[0]?.type).toBe("cleanupAuditLog")
    expect(auditRecord[0]?.status).toBe("completed")
    expect(auditRecord[0]?.durationMs).toBeGreaterThan(0)
  })

  test("should schedule multiple jobs with priorities", async () => {
    const lowPriorityJob = await submitTestJob(
      "cleanupAuditLog",
      { maxAge: 24 * 60 * 60 * 1000 },
      1,
      { priority: 1 },
    )

    const highPriorityJob = await submitTestJob(
      "cleanupAuditLog",
      { maxAge: 12 * 60 * 60 * 1000 },
      2,
      { priority: 10 },
    )

    expect(lowPriorityJob.id).toBeTruthy()
    expect(highPriorityJob.id).toBeTruthy()
    expect(lowPriorityJob.opts.priority).toBe(1)
    expect(highPriorityJob.opts.priority).toBe(10)
  })

  test("should schedule delayed jobs", async () => {
    const delay = 1000 // 1 second
    const job = await submitTestJob(
      "cleanupAuditLog",
      { maxAge: 24 * 60 * 60 * 1000 },
      1,
      { delay },
    )

    expect(job.opts.delay).toBe(delay)
    expect(job.delay).toBeGreaterThan(0)
  })
})
