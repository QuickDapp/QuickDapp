/**
 * Basic queue functionality test
 * Simple test to verify core job processing works
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { submitTestJob, waitForJob } from "../../helpers/queue"
import { createQueueTestSetup } from "../../helpers/queue-test-context"
// Import global test setup
import "../../setup"

describe("Basic Queue Functionality", () => {
  const testSetup = createQueueTestSetup({ workerCount: 1 })

  beforeAll(testSetup.beforeAll)
  afterAll(testSetup.afterAll)

  test("should process a simple job", async () => {
    // Submit a simple job
    const job = await submitTestJob("cleanupAuditLog", { maxAge: 60000 }, 1)

    expect(job.id).toBeDefined()
    expect(job.name).toBe("cleanupAuditLog")

    // Wait for job to complete with a shorter timeout
    const result = await waitForJob(job.id!, 5000)
    expect(result).toBeDefined()
  })
})
