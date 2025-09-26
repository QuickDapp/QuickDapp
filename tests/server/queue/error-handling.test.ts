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
import { submitTestJob, waitForJob, waitForJobAudit } from "../../helpers/queue"
import { createQueueTestSetup } from "../../helpers/queue-test-context"
// Import global test setup
import "../../setup"

describe("Queue Error Handling", () => {
  const testSetup = createQueueTestSetup({ workerCount: 1 })

  beforeAll(testSetup.beforeAll)
  afterAll(testSetup.afterAll)
  beforeEach(testSetup.beforeEach)
  afterEach(testSetup.afterEach)

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
      testSetup.getContext().server.serverApp,
      job.id!,
      10000, // Increased timeout for more reliability
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
      testSetup.getContext().server.serverApp,
      job.id!,
      10000, // Increased timeout for more reliability
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
    const auditRecords = await testSetup
      .getContext()
      .server.serverApp.db.select()
      .from(workerJobs)
      .where(eq(workerJobs.userId, 777))

    expect(auditRecords).toHaveLength(2)
    expect(auditRecords.every((record) => record.status === "failed")).toBe(
      true,
    )
    expect(auditRecords.every((record) => record.error)).toBe(true)
  })
})
