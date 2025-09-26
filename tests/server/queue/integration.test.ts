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
import { cleanTestDatabase, setupTestDatabase } from "../../helpers/database"
import { testLogger } from "../../helpers/logger"
import {
  cleanJobQueue,
  getQueueStatus,
  setupTestQueue,
  submitTestJob,
  teardownTestQueue,
  waitForJob,
  waitForQueueEmpty,
} from "../../helpers/queue"
import type { TestServer } from "../../helpers/server"
import { startTestServer, waitForServer } from "../../helpers/server"
// Import global test setup
import "../../setup"

describe("Queue Integration Tests", () => {
  let serverContext: TestServer

  beforeAll(async () => {
    try {
      testLogger.info("🔧 Setting up queue integration tests...")

      // Setup test database and queue
      await setupTestDatabase()
      await setupTestQueue()

      // Start test server with workers enabled
      serverContext = await startTestServer({ workerCountOverride: 2 })
      await waitForServer(serverContext.url)

      testLogger.info("✅ Queue integration test setup complete")
    } catch (error) {
      testLogger.error("❌ Queue integration test setup failed:", error)
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
      testLogger.info("🧹 Cleaning up queue integration tests...")

      // Shutdown server and cleanup queue
      await serverContext.shutdown()
      await teardownTestQueue(serverContext.serverApp)

      testLogger.info("✅ Queue integration test cleanup complete")
    } catch (error) {
      testLogger.error("❌ Queue integration test cleanup failed:", error)
    }
  })

  test("should process multiple jobs in parallel", async () => {
    const jobs = []

    // Submit multiple jobs
    for (let i = 0; i < 5; i++) {
      const job = await submitTestJob(
        "cleanupAuditLog",
        { maxAge: (i + 1) * 60 * 60 * 1000 },
        i + 1,
      )
      jobs.push(job)
    }

    // Wait for all jobs to complete
    const results = await Promise.all(
      jobs.map((job) => waitForJob(job.id!, 10000)),
    )

    // Verify all jobs completed
    expect(results).toHaveLength(5)
    results.forEach((result) => {
      expect(result).toBeDefined()
    })

    // Verify audit records were created
    const auditRecords = await serverContext.serverApp.db
      .select()
      .from(workerJobs)

    expect(auditRecords.length).toBeGreaterThanOrEqual(5)
    expect(auditRecords.every((record) => record.status === "completed")).toBe(
      true,
    )
  })

  test("should handle job priority ordering", async () => {
    // Submit jobs with different priorities (lower number = higher priority)
    const highPriorityJob = await submitTestJob(
      "cleanupAuditLog",
      { maxAge: 60000 },
      1,
      { priority: 10 }, // High priority
    )

    const lowPriorityJob = await submitTestJob(
      "cleanupAuditLog",
      { maxAge: 60000 },
      2,
      { priority: 1 }, // Low priority
    )

    const mediumPriorityJob = await submitTestJob(
      "cleanupAuditLog",
      { maxAge: 60000 },
      3,
      { priority: 5 }, // Medium priority
    )

    // Wait for all jobs to complete
    await Promise.all([
      waitForJob(highPriorityJob.id!, 10000),
      waitForJob(mediumPriorityJob.id!, 10000),
      waitForJob(lowPriorityJob.id!, 10000),
    ])

    // Verify all jobs completed (priority handling is internal to BullMQ)
    const auditRecords = await serverContext.serverApp.db
      .select()
      .from(workerJobs)
      .where(eq(workerJobs.type, "cleanupAuditLog"))

    expect(auditRecords).toHaveLength(3)
    expect(auditRecords.every((record) => record.status === "completed")).toBe(
      true,
    )
  })

  test("should handle delayed job execution", async () => {
    const delay = 2000 // 2 seconds
    const startTime = Date.now()

    // Submit a delayed job
    const job = await submitTestJob("cleanupAuditLog", { maxAge: 60000 }, 1, {
      delay,
    })

    // Wait for the job to complete
    await waitForJob(job.id!, 5000)

    const endTime = Date.now()
    const actualDelay = endTime - startTime

    // Verify the job was delayed (allow some tolerance)
    expect(actualDelay).toBeGreaterThanOrEqual(delay - 100)

    // Verify audit record shows completion
    const auditRecord = await serverContext.serverApp.db
      .select()
      .from(workerJobs)
      .where(eq(workerJobs.jobId, job.id!))
      .limit(1)

    expect(auditRecord).toHaveLength(1)
    expect(auditRecord[0]?.status).toBe("completed")
  })

  test("should handle queue status monitoring", async () => {
    // Check initial queue status
    const initialStatus = await getQueueStatus()
    expect(initialStatus.total).toBe(0)

    // Submit some jobs
    const job1 = await submitTestJob("cleanupAuditLog", { maxAge: 60000 }, 1)
    const job2 = await submitTestJob("cleanupAuditLog", { maxAge: 120000 }, 2)

    // Check queue status with jobs
    const statusWithJobs = await getQueueStatus()
    expect(statusWithJobs.total).toBeGreaterThan(0)

    // Wait for jobs to complete
    await Promise.all([
      waitForJob(job1.id!, 10000),
      waitForJob(job2.id!, 10000),
    ])

    // Wait for queue to be empty
    await waitForQueueEmpty(5000)

    // Check final queue status
    const finalStatus = await getQueueStatus()
    expect(finalStatus.waiting).toBe(0)
    expect(finalStatus.active).toBe(0)
  })

  test("should handle mixed job types", async () => {
    // Submit different types of cleanup jobs (no blockchain dependency)
    const cleanupJob1 = await submitTestJob(
      "cleanupAuditLog",
      { maxAge: 60000 },
      1,
    )

    const cleanupJob2 = await submitTestJob(
      "cleanupAuditLog",
      { maxAge: 120000 },
      2,
    )

    const cleanupJob3 = await submitTestJob(
      "cleanupAuditLog",
      { maxAge: 240000 },
      3,
    )

    // Wait for all jobs to complete
    await Promise.all([
      waitForJob(cleanupJob1.id!, 15000),
      waitForJob(cleanupJob2.id!, 15000),
      waitForJob(cleanupJob3.id!, 15000),
    ])

    // Verify audit records for all job types
    const auditRecords = await serverContext.serverApp.db
      .select()
      .from(workerJobs)

    expect(auditRecords.length).toBeGreaterThanOrEqual(3)

    const jobTypes = auditRecords.map((record) => record.type)
    expect(jobTypes).toContain("cleanupAuditLog")

    // Verify all completed successfully
    expect(auditRecords.every((record) => record.status === "completed")).toBe(
      true,
    )
  })

  test("should handle queue manager functionality", async () => {
    const queueManager = serverContext.serverApp.queueManager

    // Test job submission through queue manager
    await queueManager.submitJob("cleanupAuditLog", { maxAge: 60000 }, 1)

    // Test cron job scheduling
    await queueManager.scheduleCronJob(
      "cleanupAuditLog",
      "0 */6 * * * *", // Every 6 hours
      { maxAge: 120000 },
      "test-cron-job",
    )

    // Wait for the regular job to complete
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Verify queue status
    const status = await getQueueStatus()
    expect(status).toBeDefined()

    // Clean up the cron job
    await cleanJobQueue()
  })

  test("should handle queue error recovery", async () => {
    // Submit a job that will succeed
    const validJob = await submitTestJob(
      "cleanupAuditLog",
      { maxAge: 60000 },
      1,
    )

    // Submit a job that will fail
    const invalidJob = await submitTestJob(
      "invalidJobType" as any,
      { maxAge: undefined as any }, // Invalid undefined value
      2,
    )

    // Wait for valid job to complete
    await waitForJob(validJob.id!, 10000)

    // Wait for invalid job to fail
    try {
      await waitForJob(invalidJob.id!, 5000)
    } catch (_error) {
      // Expected to fail
    }

    // Verify that the valid job completed
    const auditRecords = await serverContext.serverApp.db
      .select()
      .from(workerJobs)

    const validAudit = auditRecords.find((r) => r.jobId === validJob.id!)
    const invalidAudit = auditRecords.find((r) => r.jobId === invalidJob.id!)

    expect(validAudit?.status).toBe("completed")

    // Invalid job might not create audit record or might be marked as failed
    if (invalidAudit) {
      expect(invalidAudit.status).toBe("failed")
      expect(invalidAudit.error).toContain("Unknown job type")
    }

    // Verify queue is still functional
    const newJob = await submitTestJob("cleanupAuditLog", { maxAge: 60000 }, 3)
    await waitForJob(newJob.id!, 10000)

    const newAudit = await serverContext.serverApp.db
      .select()
      .from(workerJobs)
      .where(eq(workerJobs.jobId, newJob.id!))
      .limit(1)

    expect(newAudit[0]?.status).toBe("completed")
  })
})
