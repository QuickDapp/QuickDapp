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
import { scheduleJob } from "../../../src/server/db/worker"
import { cleanTestDatabase, setupTestDatabase } from "../../helpers/database"
import type { TestServer } from "../../helpers/server"
import { startTestServer, waitForServer } from "../../helpers/server"
import type { TestWorkerContext } from "../../helpers/worker"
import { startTestWorker, stopTestWorker } from "../../helpers/worker"
// Import global test setup
import "../../setup"

describe("Worker Error Handling", () => {
  let serverContext: TestServer
  let workerContext: TestWorkerContext

  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase()

    // Start test server
    serverContext = await startTestServer()
    await waitForServer(serverContext.url)

    // Create and start test worker
    workerContext = await startTestWorker()
  })

  beforeEach(async () => {
    // Clean database before each test
    await cleanTestDatabase()
  })

  afterEach(async () => {
    // Clean database after each test
    await cleanTestDatabase()
  })

  afterAll(async () => {
    // Stop worker
    await stopTestWorker(workerContext)

    // Shutdown server
    await serverContext.shutdown()
  })

  test("should handle job execution errors gracefully", async () => {
    // Schedule a job with invalid type
    const job = await scheduleJob(serverContext.serverApp, {
      type: "nonExistentJob" as any,
      userId: 0,
    })

    // Wait for worker to process the job
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Verify the job was marked as failed
    const failedJob = await serverContext.serverApp.db
      .select()
      .from(workerJobs)
      .where(eq(workerJobs.id, job.id))

    expect(failedJob).toHaveLength(1)
    expect(failedJob[0]?.finished).not.toBeNull()
    expect(failedJob[0]?.success).toBe(false)
    expect(failedJob[0]?.result).toContain("error")
  })

  test("should reschedule failed jobs when configured", async () => {
    // Schedule a job that will fail with auto-reschedule enabled
    const job = await scheduleJob(serverContext.serverApp, {
      type: "nonExistentJob" as any,
      userId: 0,
      autoRescheduleOnFailure: true,
      autoRescheduleOnFailureDelay: 1000,
    })

    // Wait for job to fail and be rescheduled
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Should have the original failed job and a rescheduled job
    const allJobsForUser = await serverContext.serverApp.db
      .select()
      .from(workerJobs)
      .where(eq(workerJobs.userId, 0))

    // Should have at least 2 jobs: the failed one and the rescheduled one
    expect(allJobsForUser.length).toBeGreaterThanOrEqual(2)

    // The original job should be marked as failed
    const originalJob = allJobsForUser.find((j) => j.id === job.id)
    expect(originalJob?.success).toBe(false)
    expect(originalJob?.finished).not.toBeNull()
  })
})
