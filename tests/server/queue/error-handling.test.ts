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
  waitForJobAudit,
} from "../../helpers/queue"
import type { TestServer } from "../../helpers/server"
import { startTestServer, waitForServer } from "../../helpers/server"
// Import global test setup
import "../../setup"

describe("Queue Error Handling", () => {
  let blockchainContext: BlockchainTestContext
  let serverContext: TestServer

  beforeAll(async () => {
    try {
      testLogger.info("🔧 Setting up queue error handling tests...")

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

      testLogger.info("✅ Queue error handling test setup complete")
    } catch (error) {
      testLogger.error("❌ Queue error handling test setup failed:", error)
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
      testLogger.info("🧹 Cleaning up queue error handling tests...")

      // Shutdown server and cleanup queue
      await serverContext.shutdown()
      await teardownTestQueue(serverContext.serverApp)

      // Cleanup blockchain
      await cleanupBlockchainTestContext(blockchainContext)

      testLogger.info("✅ Queue error handling test cleanup complete")
    } catch (error) {
      testLogger.error("❌ Queue error handling test cleanup failed:", error)
    }
  })

  test("should handle job execution errors gracefully", async () => {
    // Submit a job with valid type but invalid data that will cause an error
    const job = await submitTestJob(
      "cleanupAuditLog",
      { maxAge: null as any }, // Invalid null maxAge should cause error
      999,
    )

    // Wait for the job to fail
    try {
      await waitForJob(job.id!, 10000)
    } catch (_error) {
      // Job is expected to fail
    }

    // Wait for audit record to be created
    const auditRecord = await waitForJobAudit(
      serverContext.serverApp,
      job.id!,
      5000,
    )

    // Verify the job was marked as failed in audit
    expect(auditRecord.status).toBe("failed")
    expect(auditRecord.userId).toBe(999)
    expect(auditRecord.type).toBe("cleanupAuditLog")
    expect(auditRecord.error).toBeDefined()
    expect(auditRecord.durationMs).toBeGreaterThanOrEqual(0)
  })

  test("should handle job processing timeouts", async () => {
    // Note: BullMQ handles job retries automatically based on configuration
    // This test verifies that failed jobs are properly audited

    const job = await submitTestJob(
      "cleanupAuditLog",
      { maxAge: NaN }, // Invalid NaN maxAge should cause error
      888,
      { priority: 1 },
    )

    // Wait for the job to fail
    try {
      await waitForJob(job.id!, 5000)
    } catch (_error) {
      // Job is expected to fail
    }

    // Wait for audit record
    const auditRecord = await waitForJobAudit(
      serverContext.serverApp,
      job.id!,
      3000,
    )

    // Verify audit record shows failure
    expect(auditRecord.status).toBe("failed")
    expect(auditRecord.error).toBeDefined()
    expect(auditRecord.userId).toBe(888)
  })

  test("should track multiple failed job attempts", async () => {
    // Submit multiple jobs that will fail
    const job1 = await submitTestJob(
      "cleanupAuditLog",
      { maxAge: undefined as any }, // Invalid undefined value
      777,
    )

    const job2 = await submitTestJob(
      "cleanupAuditLog",
      { maxAge: null as any }, // Invalid null value
      777,
    )

    // Wait for both jobs to fail
    try {
      await waitForJob(job1.id!, 5000)
    } catch (_error) {
      // Expected to fail
    }

    try {
      await waitForJob(job2.id!, 5000)
    } catch (_error) {
      // Expected to fail
    }

    // Check that both audit records were created
    const auditRecords = await serverContext.serverApp.db
      .select()
      .from(workerJobs)
      .where(eq(workerJobs.userId, 777))

    expect(auditRecords).toHaveLength(2)
    expect(auditRecords.every((record) => record.status === "failed")).toBe(
      true,
    )
    expect(auditRecords.every((record) => record.error)).toBe(true)
  })
})
