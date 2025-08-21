import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test"
import { scheduleJob } from "../../../src/server/db/worker"
import { cleanTestDatabase, setupTestDatabase } from "../../helpers/database"
import type { TestServer } from "../../helpers/server"
import { startTestServer, waitForServer } from "../../helpers/server"
import type { TestWorkerContext } from "../../helpers/worker"
import {
  startTestWorker,
  stopTestWorker,
  submitJobAndWait,
} from "../../helpers/worker"
// Import global test setup
import "../../setup"

describe("Worker Job Execution", () => {
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

  test("should execute removeOldWorkerJobs job", async () => {
    // Schedule a cleanup job
    const job = await scheduleJob(serverContext.serverApp, {
      type: "removeOldWorkerJobs",
      userId: 0,
    })

    // Wait for job to be processed
    const completedJob = await submitJobAndWait(serverContext.serverApp, {
      type: "removeOldWorkerJobs",
      userId: 0,
    })

    // Verify job was completed successfully
    expect(completedJob.finished).not.toBeNull()
    expect(completedJob.success).toBe(true)
    expect(completedJob.started).not.toBeNull()
    expect(completedJob.id).toBe(job.id)
  })

  test("should execute watchChain job", async () => {
    const job = await scheduleJob(serverContext.serverApp, {
      type: "watchChain",
      userId: 0,
    })

    // Submit and wait for watchChain job
    const completedJob = await submitJobAndWait(serverContext.serverApp, {
      type: "watchChain",
      userId: 0,
    })

    // Verify job was completed successfully
    expect(completedJob.finished).not.toBeNull()
    expect(completedJob.success).toBe(true)
    expect(completedJob.started).not.toBeNull()
    expect(completedJob.id).toBe(job.id)
  })
})
