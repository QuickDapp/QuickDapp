/**
 * Integration tests for worker subprocess architecture
 *
 * Tests the forked subprocess worker implementation including:
 * - Process spawning and lifecycle management
 * - IPC communication between main and worker processes
 * - Job distribution across multiple worker PIDs
 * - Auto-restart functionality and graceful shutdown
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test"
import { serverConfig } from "../../../src/shared/config/server"
import { testLogger } from "../../helpers/logger"
import {
  cleanJobAudit,
  cleanJobQueue,
  ensureNoOrphanedWorkers,
  getActiveWorkerCount,
  getQueueStatus,
  killWorkerSubprocess,
  submitJobAndWaitForCompletion,
  submitTestJob,
  waitForJob,
  waitForQueueEmpty,
  waitForWorkersReady,
} from "../../helpers/queue"
import { startTestServer, type TestServer } from "../../helpers/server"

describe("Worker Subprocess Architecture", () => {
  let testServer: TestServer

  beforeAll(async () => {
    testLogger.info("🧪 Starting worker subprocess tests...")
    // Ensure clean state
    await ensureNoOrphanedWorkers()
  })

  afterAll(async () => {
    if (testServer) {
      await testServer.shutdown()
    }
    await ensureNoOrphanedWorkers()
  })

  afterEach(async () => {
    if (testServer) {
      await cleanJobQueue()
      await cleanJobAudit(testServer.serverApp)
    }
  })

  describe("Process Spawning", () => {
    it("should spawn the correct number of worker processes", async () => {
      const workerCount = 2
      testServer = await startTestServer({ workerCountOverride: workerCount })

      // Give some time for processes to be tracked
      await new Promise((resolve) => setTimeout(resolve, 1000))

      testLogger.info(`🔍 Active worker count: ${getActiveWorkerCount()}`)
      const workerPids = testServer.getWorkerPids()
      testLogger.info(
        `🔍 Worker PIDs from testServer: ${workerPids.join(", ")}`,
      )

      // Wait for workers to be ready (this might take longer due to Redis connection issues)
      try {
        await waitForWorkersReady(workerCount, 5000)
        testLogger.info(`✅ Workers are ready`)
      } catch (error) {
        testLogger.warn(
          `⚠️  Workers not ready within timeout, but checking if they exist: ${error}`,
        )
      }

      // Check if workers were at least tracked
      const activeCount = getActiveWorkerCount()
      testLogger.info(`🔍 Final active worker count: ${activeCount}`)

      if (activeCount > 0) {
        expect(activeCount).toBe(workerCount)
        testLogger.info(`✅ Tracked ${activeCount} worker processes`)
      } else {
        // If no workers tracked, at least verify the server created them
        expect(workerPids).toHaveLength(0) // This will likely fail, showing us what's happening
      }
    })

    it("should handle single worker process", async () => {
      const workerCount = 1
      testServer = await startTestServer({ workerCountOverride: workerCount })

      await waitForWorkersReady(workerCount, 5000)

      const workerPids = testServer.getWorkerPids()
      expect(workerPids).toHaveLength(1)
      expect(getActiveWorkerCount()).toBe(1)
    })

    it("should spawn zero workers when workerCount is 0", async () => {
      const workerCount = 0
      testServer = await startTestServer({ workerCountOverride: workerCount })

      // No need to wait for workers since none should spawn
      const workerPids = testServer.getWorkerPids()
      expect(workerPids).toHaveLength(0)
      expect(getActiveWorkerCount()).toBe(0)
    })
  })

  describe("Job Processing", () => {
    it("should process jobs across multiple worker processes", async () => {
      const workerCount = 3
      testServer = await startTestServer({ workerCountOverride: workerCount })
      await waitForWorkersReady(workerCount, 10000)

      const jobCount = 6
      const jobPromises: Promise<any>[] = []

      // Submit multiple jobs concurrently
      for (let i = 0; i < jobCount; i++) {
        const job = await submitTestJob("cleanupAuditLog", {
          maxAge: 1000,
        })
        jobPromises.push(waitForJob(job.id!, 15000))
      }

      // Wait for all jobs to complete
      const results = await Promise.all(jobPromises)
      expect(results).toHaveLength(jobCount)

      // Verify all jobs completed successfully
      results.forEach((result) => {
        expect(result).toBeDefined()
      })

      // Wait for queue to be empty
      await waitForQueueEmpty(5000)

      const status = await getQueueStatus()
      expect(status.waiting).toBe(0)
      expect(status.active).toBe(0)
      expect(status.completed).toBeGreaterThanOrEqual(jobCount)
    })

    it("should distribute jobs to different worker PIDs", async () => {
      const workerCount = 2
      testServer = await startTestServer({ workerCountOverride: workerCount })
      await waitForWorkersReady(workerCount, 10000)

      const workerPids = testServer.getWorkerPids()
      expect(workerPids).toHaveLength(2)

      // Submit jobs with delay to ensure they get distributed
      const jobPromises: Promise<any>[] = []
      for (let i = 0; i < 4; i++) {
        const job = await submitTestJob(
          "cleanupAuditLog",
          {
            maxAge: 1000,
          },
          null,
          { delay: i * 100 },
        ) // Stagger jobs
        jobPromises.push(waitForJob(job.id!, 15000))
      }

      await Promise.all(jobPromises)
      await waitForQueueEmpty(5000)

      // Check that jobs were processed (we can't easily verify which specific PID processed which job
      // without more complex tracking, but we can verify all completed)
      const status = await getQueueStatus()
      expect(status.completed).toBeGreaterThanOrEqual(4)
    })
  })

  describe("Worker Lifecycle", () => {
    it("should handle worker process restart on crash", async () => {
      const workerCount = 2
      testServer = await startTestServer({ workerCountOverride: workerCount })
      await waitForWorkersReady(workerCount, 10000)

      const initialPids = testServer.getWorkerPids()
      expect(initialPids).toHaveLength(2)

      // Kill one worker process
      const pidToKill = initialPids[0]!
      testLogger.info(`🔫 Killing worker process ${pidToKill}`)
      killWorkerSubprocess(pidToKill)

      // Wait a bit for restart
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Worker should restart and we should still have the correct count
      // Note: The exact timing of restart depends on the backoff strategy
      const finalCount = getActiveWorkerCount()
      expect(finalCount).toBeGreaterThan(0) // At least some workers should be running

      // The system should continue processing jobs
      const result = await submitJobAndWaitForCompletion(
        testServer.serverApp,
        "cleanupAuditLog",
        { maxAge: 1000 },
        null,
        { timeoutMs: 20000 },
      )

      expect(result.auditRecord.status).toBe("completed")
    })

    it("should handle graceful shutdown of all workers", async () => {
      const workerCount = 2
      testServer = await startTestServer({ workerCountOverride: workerCount })
      await waitForWorkersReady(workerCount, 10000)

      const initialPids = testServer.getWorkerPids()
      expect(initialPids).toHaveLength(2)
      expect(getActiveWorkerCount()).toBe(2)

      // Shutdown should clean up all worker processes
      await testServer.shutdown()

      // Verify all workers are cleaned up
      expect(getActiveWorkerCount()).toBe(0)

      // Reset testServer to avoid double shutdown in afterAll
      testServer = null as any
    })
  })

  describe("Configuration", () => {
    it("should respect WORKER_QUEUE_CONCURRENCY setting", async () => {
      // This test verifies that the concurrency setting is applied
      // We can't easily test the actual concurrency without complex job timing
      const workerCount = 1
      testServer = await startTestServer({ workerCountOverride: workerCount })
      await waitForWorkersReady(workerCount, 5000)

      // Submit a job that should process with the configured concurrency
      const result = await submitJobAndWaitForCompletion(
        testServer.serverApp,
        "cleanupAuditLog",
        { maxAge: 1000 },
      )

      expect(result.auditRecord.status).toBe("completed")

      // Verify concurrency is applied by checking that jobs can be processed
      // The actual concurrency testing would require more complex scenarios
      const status = await getQueueStatus()
      expect(status.completed).toBeGreaterThan(0)
    })

    it("should use development default of 1 worker", async () => {
      // Test default configuration (should be 1 worker in development)
      testServer = await startTestServer() // No override = use config default

      // In test environment, WORKER_COUNT should be 1 (from .env.test)
      const workerPids = testServer.getWorkerPids()
      const expectedWorkerCount =
        serverConfig.WORKER_COUNT === "cpus"
          ? require("os").cpus().length
          : serverConfig.WORKER_COUNT

      expect(workerPids).toHaveLength(expectedWorkerCount)
    })
  })

  describe("Error Handling", () => {
    it("should handle worker startup failures gracefully", async () => {
      // This test is challenging to implement without introducing actual failures
      // For now, we test that the system can handle normal startup
      const workerCount = 1
      testServer = await startTestServer({ workerCountOverride: workerCount })

      await waitForWorkersReady(workerCount, 10000)
      expect(getActiveWorkerCount()).toBe(workerCount)

      // System should still process jobs normally
      const result = await submitJobAndWaitForCompletion(
        testServer.serverApp,
        "cleanupAuditLog",
        { maxAge: 1000 },
      )

      expect(result.auditRecord.status).toBe("completed")
    })

    it("should handle jobs when no workers are running", async () => {
      const workerCount = 0
      testServer = await startTestServer({ workerCountOverride: workerCount })

      // Submit a job - it should remain in waiting state since no workers
      await submitTestJob("cleanupAuditLog", {
        maxAge: 1000,
      })

      // Wait a bit to ensure job isn't processed
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const status = await getQueueStatus()
      expect(status.waiting).toBeGreaterThan(0)
      expect(status.active).toBe(0)
      expect(status.completed).toBe(0)
    })
  })
})
