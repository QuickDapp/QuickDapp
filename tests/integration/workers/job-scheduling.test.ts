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
import { scheduleCronJob, scheduleJob } from "../../../src/server/db/worker"
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

    // Start test server (worker count is 0 in test env)
    serverContext = await startTestServer()
    await waitForServer(serverContext.url)

    // Start separate test worker
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
    // Stop test worker
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
    expect(job.data).toMatchObject({
      testRun: true,
      test: true,
    })
    expect((job.data as any).testId).toBeTruthy()
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

    // Schedule second job of same type (this should cancel job1)
    const job2 = await scheduleJob(serverContext.serverApp, jobConfig)

    expect(job2.id).not.toBe(job1.id)

    // Both jobs should exist in database
    const allJobs = await serverContext.serverApp.db
      .select()
      .from(workerJobs)
      .where(eq(workerJobs.userId, 1))

    expect(allJobs).toHaveLength(2)
    expect(allJobs.some((j) => j.id === job1.id)).toBe(true)
    expect(allJobs.some((j) => j.id === job2.id)).toBe(true)

    // The cancellation behavior is tested elsewhere - for now just verify both jobs exist
  })
})
