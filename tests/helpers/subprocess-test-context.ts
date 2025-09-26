/**
 * Subprocess test context helper for tests that need direct worker process management
 *
 * Unlike the standard queue test context, this helper is designed for tests that need
 * to manage worker processes manually, track PIDs, and test process lifecycle.
 */

import { testLogger } from "./logger"
import { cleanJobAudit, cleanJobQueue, ensureNoOrphanedWorkers } from "./queue"
import type { TestServer } from "./server"

export interface SubprocessTestContext {
  testServer: TestServer | null
  cleanup: () => Promise<void>
}

/**
 * Create subprocess test context with manual worker process management
 */
export function createSubprocessTestContext(): {
  beforeAll: () => Promise<void>
  afterAll: () => Promise<void>
  afterEach: () => Promise<void>
  getTestServer: () => TestServer | null
  setTestServer: (server: TestServer) => void
} {
  let testServer: TestServer | null = null

  const beforeAll = async () => {
    testLogger.info("🧪 Starting worker subprocess tests...")
    await ensureNoOrphanedWorkers()
  }

  const afterAll = async () => {
    if (testServer) {
      await testServer.shutdown()
    }
    await ensureNoOrphanedWorkers()
  }

  const afterEach = async () => {
    if (testServer) {
      await cleanJobQueue()
      await cleanJobAudit(testServer.serverApp)
    }
  }

  return {
    beforeAll,
    afterAll,
    afterEach,
    getTestServer: () => testServer,
    setTestServer: (server: TestServer) => {
      testServer = server
    },
  }
}
