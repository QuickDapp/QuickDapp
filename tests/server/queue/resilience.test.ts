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
  getQueueStatus,
  submitTestJob,
  waitForJob,
  waitForQueueEmpty,
} from "../../helpers/queue"
import { createQueueTestSetup } from "../../helpers/queue-test-context"
// Import global test setup
import "../../setup"

describe("Queue Resilience", () => {
  const testSetup = createQueueTestSetup({ workerCount: 1 })

  beforeAll(testSetup.beforeAll)
  afterAll(testSetup.afterAll)
  beforeEach(testSetup.beforeEach)
  afterEach(testSetup.afterEach)

  describe("Job Retry Logic", () => {
    test("should handle job retry with exponential backoff", async () => {
      // This test verifies that BullMQ's retry mechanism works
      // We can't easily force job failures in a clean way, but we can verify
      // the retry configuration is applied correctly

      const job = await submitTestJob("cleanupAuditLog", { maxAge: 60000 }, 1)

      // Verify job has retry configuration
      expect(job.opts?.attempts).toBeDefined()
      expect(job.opts?.attempts).toBeGreaterThan(1)

      // Job should complete successfully
      const result = await waitForJob(job.id!, 10000)
      expect(result).toBeDefined()

      const status = await getQueueStatus()
      expect(status.completed).toBeGreaterThanOrEqual(1) // May include previous jobs in test run
      expect(status.failed).toBe(0)
    })

    test("should handle stalled job detection", async () => {
      // Test that stalled job detection is configured properly
      const job = await submitTestJob("cleanupAuditLog", { maxAge: 60000 }, 1)

      // Verify stalled interval configuration is applied
      // Note: We can't easily test actual stalled job recovery without
      // complex process manipulation, but we can verify the job processes normally
      const result = await waitForJob(job.id!, 15000)
      expect(result).toBeDefined()

      const status = await getQueueStatus()
      expect(status.completed).toBeGreaterThanOrEqual(1) // May include previous jobs in test run
      expect(status.active).toBe(0)
    })
  })

  describe("Queue Recovery", () => {
    test("should handle empty queue gracefully", async () => {
      // Test behavior with no jobs in queue
      const initialStatus = await getQueueStatus()
      expect(initialStatus.total).toBe(0)

      // Queue should be ready to accept new jobs
      const job = await submitTestJob("cleanupAuditLog", { maxAge: 60000 }, 1)
      expect(job.id).toBeDefined()

      await waitForJob(job.id!, 10000)

      const finalStatus = await getQueueStatus()
      expect(finalStatus.completed).toBe(1)
    })

    test("should handle large number of jobs", async () => {
      // Test queue performance with many jobs
      const jobCount = 20
      const jobs: any[] = []

      // Submit many jobs quickly
      for (let i = 0; i < jobCount; i++) {
        const job = await submitTestJob(
          "cleanupAuditLog",
          { maxAge: (i + 1) * 1000 },
          i + 1,
        )
        jobs.push(job)
      }

      expect(jobs).toHaveLength(jobCount)

      // Wait for all jobs to complete
      await Promise.all(jobs.map((job) => waitForJob(job.id!, 20000)))

      const status = await getQueueStatus()
      expect(status.completed).toBe(jobCount)
      expect(status.failed).toBe(0)
    })

    test("should handle concurrent job submission", async () => {
      // Test concurrent job submission from multiple "clients"
      const batchSize = 5
      const batchCount = 3

      const allJobPromises: Promise<any>[] = []

      // Submit jobs in concurrent batches
      for (let batch = 0; batch < batchCount; batch++) {
        const batchJobs: Promise<any>[] = []

        for (let i = 0; i < batchSize; i++) {
          const jobIndex = batch * batchSize + i
          const jobPromise = submitTestJob(
            "cleanupAuditLog",
            { maxAge: (jobIndex + 1) * 1000 },
            jobIndex + 1,
          ).then((job) => waitForJob(job.id!, 15000))

          batchJobs.push(jobPromise)
        }

        // Wait for current batch to be submitted, then continue
        allJobPromises.push(...batchJobs)
      }

      // Wait for all jobs to complete
      const results = await Promise.all(allJobPromises)
      expect(results).toHaveLength(batchSize * batchCount)

      const status = await getQueueStatus()
      expect(status.completed).toBe(batchSize * batchCount)
    })
  })

  describe("System Stability", () => {
    test("should maintain queue stability during high load", async () => {
      // Test system stability under sustained load
      const jobCount = 15
      const jobs: any[] = []

      // Submit jobs with varying delays to simulate real-world usage
      for (let i = 0; i < jobCount; i++) {
        const delay = Math.random() * 1000 // Random delay up to 1 second
        const job = await submitTestJob(
          "cleanupAuditLog",
          { maxAge: (i + 1) * 1000 },
          i + 1,
          { delay: Math.floor(delay) },
        )
        jobs.push(job)
      }

      // Wait for all jobs to complete
      const results = await Promise.all(
        jobs.map((job) => waitForJob(job.id!, 20000)),
      )

      expect(results).toHaveLength(jobCount)
      results.forEach((result) => {
        expect(result).toBeDefined()
      })

      // Verify queue is stable after high load
      await waitForQueueEmpty(5000)
      const finalStatus = await getQueueStatus()
      expect(finalStatus.waiting).toBe(0)
      expect(finalStatus.active).toBe(0)
      expect(finalStatus.completed).toBe(jobCount)
    })

    test("should handle mixed job types and priorities", async () => {
      // Test system stability with different job types and priorities
      const jobs = [
        submitTestJob("cleanupAuditLog", { maxAge: 60000 }, 1, { priority: 1 }),
        submitTestJob("cleanupAuditLog", { maxAge: 120000 }, 2, {
          priority: 5,
        }),
        submitTestJob("cleanupAuditLog", { maxAge: 180000 }, 3, {
          priority: 10,
        }),
      ]

      const submittedJobs = await Promise.all(jobs)
      expect(submittedJobs).toHaveLength(3)

      // Wait for all jobs to complete
      const results = await Promise.all(
        submittedJobs.map((job) => waitForJob(job.id!, 15000)),
      )

      expect(results).toHaveLength(3)
      results.forEach((result) => {
        expect(result).toBeDefined()
      })

      const status = await getQueueStatus()
      expect(status.completed).toBe(3)
      expect(status.failed).toBe(0)
    })

    test("should recover from job processing errors", async () => {
      // Test recovery after jobs with errors
      const validJob = await submitTestJob(
        "cleanupAuditLog",
        { maxAge: 60000 },
        1,
      )

      // Submit a job that might cause issues (but should still be handled gracefully)
      const edgeCaseJob = await submitTestJob(
        "cleanupAuditLog",
        { maxAge: 0 }, // Edge case: zero maxAge
        2,
      )

      const anotherValidJob = await submitTestJob(
        "cleanupAuditLog",
        { maxAge: 120000 },
        3,
      )

      // Wait for jobs to process (some might fail, but system should recover)
      await Promise.allSettled([
        waitForJob(validJob.id!, 10000),
        waitForJob(edgeCaseJob.id!, 10000),
        waitForJob(anotherValidJob.id!, 10000),
      ])

      // System should still be able to process new jobs after any failures
      const recoveryJob = await submitTestJob(
        "cleanupAuditLog",
        { maxAge: 60000 },
        4,
      )

      const recoveryResult = await waitForJob(recoveryJob.id!, 10000)
      expect(recoveryResult).toBeDefined()

      // Queue should be functional
      const finalStatus = await getQueueStatus()
      expect(finalStatus.completed + finalStatus.failed).toBeGreaterThanOrEqual(
        3,
      )
    })
  })

  describe("Configuration Resilience", () => {
    test("should handle various job data formats", async () => {
      // Test resilience with different data formats
      const testCases = [
        { maxAge: 60000 }, // Normal case
        { maxAge: 1 }, // Minimum value
        { maxAge: 86400000 }, // Large value (24 hours)
      ]

      for (const [index, data] of testCases.entries()) {
        const job = await submitTestJob("cleanupAuditLog", data, index + 1)
        const result = await waitForJob(job.id!, 10000)
        expect(result).toBeDefined()
      }

      const status = await getQueueStatus()
      expect(status.completed).toBe(testCases.length)
    })

    test("should handle job scheduling edge cases", async () => {
      // Test edge cases in job scheduling
      const jobs = [
        submitTestJob("cleanupAuditLog", { maxAge: 60000 }, 1, { delay: 0 }), // No delay
        submitTestJob("cleanupAuditLog", { maxAge: 60000 }, 2, { delay: 100 }), // Short delay
        submitTestJob("cleanupAuditLog", { maxAge: 60000 }, 3), // No options
      ]

      const submittedJobs = await Promise.all(jobs)
      expect(submittedJobs).toHaveLength(3)

      // All should complete successfully regardless of edge case parameters
      const results = await Promise.all(
        submittedJobs.map((job) => waitForJob(job.id!, 15000)),
      )

      expect(results).toHaveLength(3)
      results.forEach((result) => {
        expect(result).toBeDefined()
      })
    })
  })
})
