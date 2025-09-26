import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test"
import { workerJobs } from "../../../src/server/db/schema"
import type { BlockchainTestContext } from "../../helpers/blockchain"
import {
  cleanupBlockchainTestContext,
  createBlockchainTestContext,
} from "../../helpers/blockchain"
import {
  cleanTestDatabase,
  createTestWorkerJobAudit,
  setupTestDatabase,
} from "../../helpers/database"
import { testLogger } from "../../helpers/logger"
import {
  cleanJobQueue,
  setupTestQueue,
  submitJobAndWaitForCompletion,
  teardownTestQueue,
} from "../../helpers/queue"
import type { TestServer } from "../../helpers/server"
import { startTestServer, waitForServer } from "../../helpers/server"
// Import global test setup
import "../../setup"

describe("Queue Audit Cleanup", () => {
  let blockchainContext: BlockchainTestContext
  let serverContext: TestServer

  beforeAll(async () => {
    try {
      testLogger.info("🔧 Setting up queue audit cleanup tests...")

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

      testLogger.info("✅ Queue audit cleanup test setup complete")
    } catch (error) {
      testLogger.error("❌ Queue audit cleanup test setup failed:", error)
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
      testLogger.info("🧹 Cleaning up queue audit cleanup tests...")

      // Shutdown server and cleanup queue
      await serverContext.shutdown()
      await teardownTestQueue(serverContext.serverApp)

      // Cleanup blockchain
      await cleanupBlockchainTestContext(blockchainContext)

      testLogger.info("✅ Queue audit cleanup test cleanup complete")
    } catch (error) {
      testLogger.error("❌ Queue audit cleanup test cleanup failed:", error)
    }
  })

  test("should clean up old audit records", async () => {
    // Create old audit records (older than 24 hours)
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago

    const _oldAudit1 = await createTestWorkerJobAudit({
      jobId: "old-job-1",
      type: "cleanupAuditLog",
      userId: 1,
      status: "completed",
      startedAt: oldDate,
      completedAt: oldDate,
      durationMs: 100,
    })

    const _oldAudit2 = await createTestWorkerJobAudit({
      jobId: "old-job-2",
      type: "watchChain",
      userId: 2,
      status: "completed",
      startedAt: oldDate,
      completedAt: oldDate,
      durationMs: 200,
    })

    // Create recent audit record (should not be cleaned up)
    const _recentAudit = await createTestWorkerJobAudit({
      jobId: "recent-job",
      type: "cleanupAuditLog",
      userId: 3,
      status: "completed",
      startedAt: new Date(),
      completedAt: new Date(),
      durationMs: 150,
    })

    // Verify all records exist
    const allRecordsBefore = await serverContext.serverApp.db
      .select()
      .from(workerJobs)
    expect(allRecordsBefore).toHaveLength(3)

    // Run cleanup job with 24-hour age limit
    const { auditRecord } = await submitJobAndWaitForCompletion(
      serverContext.serverApp,
      "cleanupAuditLog",
      { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours in milliseconds
      0, // System user
      { timeoutMs: 10000 },
    )

    // Verify cleanup job completed successfully
    expect(auditRecord.status).toBe("completed")

    // Check that old records were removed but recent one remains
    const remainingRecords = await serverContext.serverApp.db
      .select()
      .from(workerJobs)

    // Should have the recent audit record plus the cleanup job audit record
    expect(remainingRecords.length).toBeGreaterThanOrEqual(1)

    // Verify the recent record still exists
    const recentRecord = remainingRecords.find((r) => r.jobId === "recent-job")
    expect(recentRecord).toBeDefined()

    // Verify old records were removed
    const oldRecord1 = remainingRecords.find((r) => r.jobId === "old-job-1")
    const oldRecord2 = remainingRecords.find((r) => r.jobId === "old-job-2")
    expect(oldRecord1).toBeUndefined()
    expect(oldRecord2).toBeUndefined()
  })

  test("should not remove running job audit records", async () => {
    // Create an audit record for a currently running job (no completedAt)
    const _runningAudit = await createTestWorkerJobAudit({
      jobId: "running-job",
      type: "watchChain",
      userId: 1,
      status: "active",
      startedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // Old start time
      completedAt: null, // Not completed yet
    })

    // Create an old completed job
    const _oldCompletedAudit = await createTestWorkerJobAudit({
      jobId: "old-completed-job",
      type: "cleanupAuditLog",
      userId: 2,
      status: "completed",
      startedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      durationMs: 100,
    })

    // Run cleanup
    await submitJobAndWaitForCompletion(
      serverContext.serverApp,
      "cleanupAuditLog",
      { maxAge: 24 * 60 * 60 * 1000 },
      0,
      { timeoutMs: 10000 },
    )

    // Check remaining records
    const remainingRecords = await serverContext.serverApp.db
      .select()
      .from(workerJobs)

    // Running job should still exist
    const runningRecord = remainingRecords.find(
      (r) => r.jobId === "running-job",
    )
    expect(runningRecord).toBeDefined()

    // Old completed job should be removed
    const oldCompletedRecord = remainingRecords.find(
      (r) => r.jobId === "old-completed-job",
    )
    expect(oldCompletedRecord).toBeUndefined()
  })

  test("should handle cleanup with different age limits", async () => {
    // Create audit records at different ages
    const now = Date.now()
    const oneHourAgo = new Date(now - 60 * 60 * 1000)
    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000)
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000)

    await createTestWorkerJobAudit({
      jobId: "one-hour-old",
      type: "cleanupAuditLog",
      status: "completed",
      startedAt: oneHourAgo,
      completedAt: oneHourAgo,
    })

    await createTestWorkerJobAudit({
      jobId: "two-hours-old",
      type: "cleanupAuditLog",
      status: "completed",
      startedAt: twoHoursAgo,
      completedAt: twoHoursAgo,
    })

    await createTestWorkerJobAudit({
      jobId: "three-days-old",
      type: "watchChain",
      status: "completed",
      startedAt: threeDaysAgo,
      completedAt: threeDaysAgo,
    })

    // Run cleanup with 90-minute age limit
    await submitJobAndWaitForCompletion(
      serverContext.serverApp,
      "cleanupAuditLog",
      { maxAge: 90 * 60 * 1000 }, // 90 minutes
      0,
      { timeoutMs: 10000 },
    )

    const remainingRecords = await serverContext.serverApp.db
      .select()
      .from(workerJobs)

    // One hour old record should remain
    expect(
      remainingRecords.find((r) => r.jobId === "one-hour-old"),
    ).toBeDefined()

    // Two hours old and three days old should be removed
    expect(
      remainingRecords.find((r) => r.jobId === "two-hours-old"),
    ).toBeUndefined()
    expect(
      remainingRecords.find((r) => r.jobId === "three-days-old"),
    ).toBeUndefined()
  })
})
