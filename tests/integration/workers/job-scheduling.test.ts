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
  scheduleJob,
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

describe("Worker Job Scheduling", () => {
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

  test("should schedule a job successfully", async () => {
    const jobConfig = createTestJobConfig({
      type: "removeOldWorkerJobs",
      userId: 1,
      data: { test: true },
    })

    const job = await scheduleJob(serverContext.serverApp, jobConfig)

    expect(job.id).toBeGreaterThan(0)
    expect(job.type).toBe("removeOldWorkerJobs")
    expect(job.userId).toBe(1)
    expect(job.data).toEqual({ test: true })
    expect(job.finished).toBeNull()
    expect(job.success).toBeNull()
  })

  test("should schedule a cron job successfully", async () => {
    const jobConfig = createTestJobConfig({
      type: "watchChain",
      userId: 0,
    })

    const job = await scheduleCronJob(
      serverContext.serverApp,
      jobConfig,
      "0 * * * * *", // every minute
    )

    expect(job.id).toBeGreaterThan(0)
    expect(job.type).toBe("watchChain")
    expect(job.cronSchedule).toBe("0 * * * * *")
    expect(job.due).toBeInstanceOf(Date)
  })

  test("should cancel existing pending jobs when scheduling new job of same type", async () => {
    const jobConfig = createTestJobConfig({
      type: "removeOldWorkerJobs",
      userId: 1,
    })

    // Schedule first job
    const job1 = await scheduleJob(serverContext.serverApp, jobConfig)

    // Schedule second job of same type
    const job2 = await scheduleJob(serverContext.serverApp, jobConfig)

    expect(job2.id).not.toBe(job1.id)

    // Only one job should be pending
    const pendingCount = await getTotalPendingJobs(serverContext.serverApp)
    expect(pendingCount).toBe(1)
  })
})
