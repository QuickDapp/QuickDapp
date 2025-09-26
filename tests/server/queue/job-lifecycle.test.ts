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
import {
  findJobAuditRecords,
  submitJobAndWaitForCompletion,
  submitTestJob,
  waitForJob,
} from "../../helpers/queue"
import { createQueueTestSetup } from "../../helpers/queue-test-context"
// Import global test setup
import "../../setup"

describe("Queue Job Lifecycle", () => {
  const testSetup = createQueueTestSetup({ workerCount: 1 })

  beforeAll(testSetup.beforeAll)
  afterAll(testSetup.afterAll)
  beforeEach(testSetup.beforeEach)
  afterEach(testSetup.afterEach)

  describe("Job Scheduling", () => {
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

    test("should schedule job with delay", async () => {
      const delay = 1000 // 1 second
      const startTime = Date.now()

      const job = await submitTestJob("cleanupAuditLog", { maxAge: 60000 }, 1, {
        delay,
      })

      // Wait for the job to complete
      await waitForJob(job.id!, 5000)

      const endTime = Date.now()
      const actualDelay = endTime - startTime

      // Verify the job was delayed (allow some tolerance)
      expect(actualDelay).toBeGreaterThanOrEqual(delay - 200)
      expect(job.opts?.delay).toBe(delay)
    })

    test("should schedule job with priority", async () => {
      const highPriorityJob = await submitTestJob(
        "cleanupAuditLog",
        { maxAge: 60000 },
        1,
        { priority: 1 }, // High priority (lower number)
      )

      const lowPriorityJob = await submitTestJob(
        "cleanupAuditLog",
        { maxAge: 60000 },
        2,
        { priority: 10 }, // Low priority (higher number)
      )

      expect(highPriorityJob.opts?.priority).toBe(1)
      expect(lowPriorityJob.opts?.priority).toBe(10)

      // Wait for jobs to complete
      await Promise.all([
        waitForJob(highPriorityJob.id!, 10000),
        waitForJob(lowPriorityJob.id!, 10000),
      ])

      // Verify both jobs completed
      const auditRecords = await testSetup
        .getContext()
        .server.serverApp.db.select()
        .from(workerJobs)
        .where(eq(workerJobs.type, "cleanupAuditLog"))

      expect(auditRecords).toHaveLength(2)
      expect(
        auditRecords.every((record) => record.status === "completed"),
      ).toBe(true)
    })

    test("should handle default job priorities", async () => {
      // Test that jobs without explicit priority get default priority
      const jobWithoutPriority = await submitTestJob(
        "cleanupAuditLog",
        { maxAge: 60000 },
        1,
      )

      const jobWithExplicitDefault = await submitTestJob(
        "cleanupAuditLog",
        { maxAge: 60000 },
        2,
        { priority: 5 }, // Default priority
      )

      // Both should have same priority behavior
      expect(jobWithoutPriority.opts?.priority).toBeDefined()
      expect(jobWithExplicitDefault.opts?.priority).toBe(5)

      await Promise.all([
        waitForJob(jobWithoutPriority.id!, 10000),
        waitForJob(jobWithExplicitDefault.id!, 10000),
      ])

      // Verify both completed
      const auditRecords = await testSetup
        .getContext()
        .server.serverApp.db.select()
        .from(workerJobs)
        .where(eq(workerJobs.type, "cleanupAuditLog"))

      expect(auditRecords).toHaveLength(2)
      expect(
        auditRecords.every((record) => record.status === "completed"),
      ).toBe(true)
    })

    test("should schedule multiple jobs with different users", async () => {
      const jobs = []

      // Schedule jobs for different users
      for (let userId = 1; userId <= 3; userId++) {
        const job = await submitTestJob(
          "cleanupAuditLog",
          { maxAge: userId * 60000 },
          userId,
        )
        jobs.push(job)
      }

      expect(jobs).toHaveLength(3)
      jobs.forEach((job, index) => {
        expect(job.data.userId).toBe(index + 1)
        expect(job.data.data.maxAge).toBe((index + 1) * 60000)
      })

      // Wait for all jobs to complete
      await Promise.all(jobs.map((job) => waitForJob(job.id!, 10000)))

      // Verify audit records for all users
      const auditRecords = await findJobAuditRecords(
        testSetup.getContext().server.serverApp,
        {
          type: "cleanupAuditLog",
          status: "completed",
        },
      )

      expect(auditRecords.length).toBeGreaterThanOrEqual(3)
      expect(
        [1, 2, 3].every((userId) =>
          auditRecords.some((record) => record.userId === userId),
        ),
      ).toBe(true)
    })
  })

  describe("Job Execution", () => {
    test("should execute cleanupAuditLog job successfully", async () => {
      const { job, auditRecord } = await submitJobAndWaitForCompletion(
        testSetup.getContext().server.serverApp,
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
      const { job, auditRecord } = await submitJobAndWaitForCompletion(
        testSetup.getContext().server.serverApp,
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

    test("should execute multiple jobs sequentially", async () => {
      const results = []

      for (let i = 1; i <= 3; i++) {
        const result = await submitJobAndWaitForCompletion(
          testSetup.getContext().server.serverApp,
          "cleanupAuditLog",
          { maxAge: i * 60 * 60 * 1000 },
          i * 100,
          { timeoutMs: 10000 },
        )
        results.push(result)
      }

      expect(results).toHaveLength(3)
      results.forEach((result, index) => {
        expect(result.auditRecord.status).toBe("completed")
        expect(result.auditRecord.userId).toBe((index + 1) * 100)
        expect(result.auditRecord.type).toBe("cleanupAuditLog")
      })
    })

    test("should track job execution timing", async () => {
      const { auditRecord } = await submitJobAndWaitForCompletion(
        testSetup.getContext().server.serverApp,
        "cleanupAuditLog",
        { maxAge: 60000 },
        555,
      )

      expect(auditRecord.startedAt).toBeDefined()
      expect(auditRecord.completedAt).toBeDefined()
      expect(auditRecord.durationMs).toBeGreaterThan(0)

      const startTime = new Date(auditRecord.startedAt).getTime()
      const endTime = new Date(auditRecord.completedAt!).getTime()
      const calculatedDuration = endTime - startTime

      // Duration should be roughly accurate (within 100ms tolerance)
      expect(
        Math.abs(auditRecord.durationMs! - calculatedDuration),
      ).toBeLessThan(100)
    })
  })

  describe("Job Audit", () => {
    test("should find job audit records by criteria", async () => {
      // Execute multiple jobs
      await submitJobAndWaitForCompletion(
        testSetup.getContext().server.serverApp,
        "cleanupAuditLog",
        { maxAge: 24 * 60 * 60 * 1000 },
        100,
        { timeoutMs: 10000 },
      )

      await submitJobAndWaitForCompletion(
        testSetup.getContext().server.serverApp,
        "cleanupAuditLog",
        { maxAge: 12 * 60 * 60 * 1000 },
        200,
        { timeoutMs: 10000 },
      )

      // Find audit records by type
      const auditRecordsByType = await findJobAuditRecords(
        testSetup.getContext().server.serverApp,
        {
          type: "cleanupAuditLog",
        },
      )
      expect(auditRecordsByType).toHaveLength(2)

      // Find audit records by user
      const auditRecordsByUser = await findJobAuditRecords(
        testSetup.getContext().server.serverApp,
        {
          userId: 100,
        },
      )
      expect(auditRecordsByUser).toHaveLength(1)
      expect(auditRecordsByUser[0]?.userId).toBe(100)

      // Find audit records by status
      const auditRecordsByStatus = await findJobAuditRecords(
        testSetup.getContext().server.serverApp,
        {
          status: "completed",
        },
      )
      expect(auditRecordsByStatus.length).toBeGreaterThanOrEqual(2)
    })

    test("should create audit records with correct data", async () => {
      const testData = { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
      const testUserId = 999

      const { auditRecord } = await submitJobAndWaitForCompletion(
        testSetup.getContext().server.serverApp,
        "cleanupAuditLog",
        testData,
        testUserId,
      )

      expect(auditRecord.jobId).toBeDefined()
      expect(auditRecord.type).toBe("cleanupAuditLog")
      expect(auditRecord.userId).toBe(testUserId)
      expect(auditRecord.data).toEqual(testData)
      expect(auditRecord.status).toBe("completed")
      expect(auditRecord.result).toBeDefined()
      expect(auditRecord.error).toBeNull()
      expect(auditRecord.createdAt).toBeDefined()
    })
  })
})
