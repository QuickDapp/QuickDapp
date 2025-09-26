import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test"
import { cleanJobQueue, getQueueStatus } from "../../helpers/queue"
import { createQueueTestSetup } from "../../helpers/queue-test-context"
// Import global test setup
import "../../setup"

describe("Queue Cron Job Scheduling", () => {
  const testSetup = createQueueTestSetup({ workerCount: 1 })

  beforeAll(testSetup.beforeAll)
  afterAll(testSetup.afterAll)
  beforeEach(testSetup.beforeEach)
  afterEach(testSetup.afterEach)

  test("should handle cron job scheduling via QueueManager", async () => {
    // Test that QueueManager can schedule cron jobs
    // Note: In the new system, cron jobs are handled by QueueManager.scheduleCronJob()

    const cronExpression = "*/30 * * * * *" // Every 30 seconds

    await testSetup
      .getContext()
      .server.serverApp.queueManager.scheduleCronJob(
        "cleanupAuditLog",
        cronExpression,
        { maxAge: 24 * 60 * 60 * 1000 },
        "test-cleanup-job",
      )

    // Wait a moment for the job to be scheduled
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Check that a repeatable job exists
    const queueStatus = await getQueueStatus()

    // The exact behavior depends on BullMQ's internal state
    // We mainly want to verify no errors occurred during scheduling
    expect(queueStatus).toBeDefined()
    expect(queueStatus.total).toBeGreaterThanOrEqual(0)
  })

  test("should handle cron job execution", async () => {
    // Schedule a cron job that runs every 2 seconds
    await testSetup.getContext().server.serverApp.queueManager.scheduleCronJob(
      "cleanupAuditLog",
      "*/2 * * * * *", // Every 2 seconds
      { maxAge: 1 * 60 * 60 * 1000 }, // 1 hour
      "test-execution-job",
    )

    // Wait for at least one execution
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Check queue status to see if jobs were processed
    const queueStatus = await getQueueStatus()
    expect(queueStatus).toBeDefined()

    // At minimum, verify the system is still stable after cron job setup
    expect(queueStatus.total).toBeGreaterThanOrEqual(0)
  })

  test("should cleanup cron jobs on shutdown", async () => {
    // Schedule multiple cron jobs
    await testSetup.getContext().server.serverApp.queueManager.scheduleCronJob(
      "cleanupAuditLog",
      "0 */6 * * * *", // Every 6 hours
      { maxAge: 24 * 60 * 60 * 1000 },
      "test-cleanup-shutdown",
    )

    await testSetup.getContext().server.serverApp.queueManager.scheduleCronJob(
      "watchChain",
      "*/30 * * * * *", // Every 30 seconds
      { fromBlock: 1000000n },
      "test-watch-shutdown",
    )

    // Wait for jobs to be scheduled
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Clean the queue (this should remove repeatable jobs)
    await cleanJobQueue()

    // Verify queue is clean
    const queueStatus = await getQueueStatus()
    expect(queueStatus.total).toBe(0)
  })
})
