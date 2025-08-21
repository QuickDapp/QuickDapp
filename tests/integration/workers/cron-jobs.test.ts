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
  getTotalPendingJobs,
  scheduleCronJob,
} from "../../../src/server/db/worker"
import { cleanTestDatabase, setupTestDatabase } from "../../helpers/database"
import type { TestServer } from "../../helpers/server"
import { startTestServer, waitForServer } from "../../helpers/server"
import type { TestWorkerContext } from "../../helpers/worker"
import {
  createTestJobConfig,
  startTestWorker,
  stopTestWorker,
} from "../../helpers/worker"
// Import global test setup
import "../../setup"

describe("Worker Cron Job Scheduling", () => {
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

  test("should reschedule cron job after execution", async () => {
    const jobConfig = createTestJobConfig({
      type: "removeOldWorkerJobs",
      userId: 0,
    })

    await scheduleCronJob(
      serverContext.serverApp,
      jobConfig,
      "*/5 * * * * *", // every 5 seconds
    )

    // Worker is already started in beforeEach

    // Wait longer than the job execution time
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Should have created a new job for the next cron execution
    const pendingCount = await getTotalPendingJobs(serverContext.serverApp)
    expect(pendingCount).toBeGreaterThanOrEqual(1)
  })
})
