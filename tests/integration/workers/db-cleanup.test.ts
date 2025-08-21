import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test"
import { eq, inArray } from "drizzle-orm"
import { workerJobs } from "../../../src/server/db/schema"
import { removeOldJobs, scheduleJob } from "../../../src/server/db/worker"
import { cleanTestDatabase, setupTestDatabase } from "../../helpers/database"
import type { TestServer } from "../../helpers/server"
import { startTestServer, waitForServer } from "../../helpers/server"
import type { TestWorkerContext } from "../../helpers/worker"
import { startTestWorker, stopTestWorker } from "../../helpers/worker"
// Import global test setup
import "../../setup"

describe("Worker Database Cleanup", () => {
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

  test("should remove old completed jobs", async () => {
    // Create and complete several old jobs
    const oldJobIds: number[] = []

    for (let i = 0; i < 3; i++) {
      const job = await scheduleJob(serverContext.serverApp, {
        type: "removeOldWorkerJobs",
        userId: i,
        removeDelay: -1000, // Already expired
      })
      oldJobIds.push(job.id)
    }

    // Mark all as completed and set removeAt to past date
    const pastDate = new Date(Date.now() - 2000) // 2 seconds ago
    for (const jobId of oldJobIds) {
      await serverContext.serverApp.db
        .update(workerJobs)
        .set({
          started: new Date(),
          finished: new Date(),
          success: true,
          removeAt: pastDate, // Mark for removal
        })
        .where(eq(workerJobs.id, jobId))
    }

    // Verify jobs exist before cleanup
    const jobsBeforeCleanup = await serverContext.serverApp.db
      .select()
      .from(workerJobs)
      .where(inArray(workerJobs.id, oldJobIds))
    expect(jobsBeforeCleanup).toHaveLength(3)

    // Run cleanup
    await removeOldJobs(serverContext.serverApp, { exclude: [] })

    // Verify jobs are actually removed
    const remainingJobs = await serverContext.serverApp.db
      .select()
      .from(workerJobs)
      .where(inArray(workerJobs.id, oldJobIds))
    expect(remainingJobs).toHaveLength(0)
  })
})
