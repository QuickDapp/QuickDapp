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
  findJobAuditRecords,
  setupTestQueue,
  submitJobAndWaitForCompletion,
  teardownTestQueue,
} from "../../helpers/queue"
import type { TestServer } from "../../helpers/server"
import { startTestServer, waitForServer } from "../../helpers/server"
// Import global test setup
import "../../setup"

describe("Queue Job Execution", () => {
  let blockchainContext: BlockchainTestContext
  let serverContext: TestServer

  beforeAll(async () => {
    try {
      testLogger.info("🔧 Setting up queue job execution tests...")

      // Setup test database and queue
      await setupTestDatabase()
      await setupTestQueue()

      // Start testnet blockchain instance for deployMulticall3 job
      testLogger.info("🔗 Starting test blockchain...")
      blockchainContext = await createBlockchainTestContext()
      testLogger.info(
        `✅ Test blockchain started at ${blockchainContext.testnet.url}`,
      )

      // Start test server with workers enabled
      serverContext = await startTestServer({ workerCountOverride: 1 })
      await waitForServer(serverContext.url)

      testLogger.info("✅ Queue job execution test setup complete")
    } catch (error) {
      testLogger.error("❌ Queue job execution test setup failed:", error)
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
      testLogger.info("🧹 Cleaning up queue job execution tests...")

      // Shutdown server and cleanup queue
      await serverContext.shutdown()
      await teardownTestQueue(serverContext.serverApp)

      // Cleanup blockchain
      await cleanupBlockchainTestContext(blockchainContext)

      testLogger.info("✅ Queue job execution test cleanup complete")
    } catch (error) {
      testLogger.error("❌ Queue job execution test cleanup failed:", error)
    }
  })

  test("should execute cleanupAuditLog job successfully", async () => {
    const { job, result, auditRecord } = await submitJobAndWaitForCompletion(
      serverContext.serverApp,
      "cleanupAuditLog",
      { maxAge: 24 * 60 * 60 * 1000 },
      777,
      { timeoutMs: 10000 },
    )

    // Verify job was completed successfully
    expect(job.returnvalue).toBeDefined()
    expect(auditRecord.status).toBe("completed")
    expect(auditRecord.userId).toBe(777)
    expect(auditRecord.type).toBe("cleanupAuditLog")
    expect(auditRecord.durationMs).toBeGreaterThan(0)
    expect(auditRecord.result).toBeDefined()
  })

  test("should execute job with different user", async () => {
    const { job, result, auditRecord } = await submitJobAndWaitForCompletion(
      serverContext.serverApp,
      "cleanupAuditLog",
      { maxAge: 12 * 60 * 60 * 1000 },
      888,
      { timeoutMs: 10000 },
    )

    // Verify job was completed successfully
    expect(job.returnvalue).toBeDefined()
    expect(auditRecord.status).toBe("completed")
    expect(auditRecord.userId).toBe(888)
    expect(auditRecord.type).toBe("cleanupAuditLog")
    expect(auditRecord.data).toMatchObject({
      maxAge: 12 * 60 * 60 * 1000,
    })
  })

  test("should find job audit records by criteria", async () => {
    // Execute multiple jobs
    await submitJobAndWaitForCompletion(
      serverContext.serverApp,
      "cleanupAuditLog",
      { maxAge: 24 * 60 * 60 * 1000 },
      100,
      { timeoutMs: 10000 },
    )

    await submitJobAndWaitForCompletion(
      serverContext.serverApp,
      "cleanupAuditLog",
      { maxAge: 12 * 60 * 60 * 1000 },
      200,
      { timeoutMs: 10000 },
    )

    // Find audit records by type
    const auditRecordsByType = await findJobAuditRecords(
      serverContext.serverApp,
      {
        type: "cleanupAuditLog",
      },
    )
    expect(auditRecordsByType).toHaveLength(2)

    // Find audit records by user
    const auditRecordsByUser = await findJobAuditRecords(
      serverContext.serverApp,
      {
        userId: 100,
      },
    )
    expect(auditRecordsByUser).toHaveLength(1)
    expect(auditRecordsByUser[0]?.userId).toBe(100)

    // Find audit records by status
    const auditRecordsByStatus = await findJobAuditRecords(
      serverContext.serverApp,
      {
        status: "completed",
      },
    )
    expect(auditRecordsByStatus.length).toBeGreaterThanOrEqual(2)
  })
})
