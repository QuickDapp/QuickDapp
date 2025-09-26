/**
 * Server test helpers for QuickDapp v3
 *
 * Utilities for starting/stopping test servers, making requests,
 * and managing test server lifecycle.
 */

import { createApp } from "../../src/server/start-server"
import type { ServerApp } from "../../src/server/types"
import { testLogger } from "./logger"
import {
  ensureNoOrphanedWorkers,
  getWorkerProcessPids,
  trackWorkerProcess,
  waitForWorkersReady,
} from "./queue"

export interface TestServer {
  app: any
  server: any
  serverApp: ServerApp
  url: string
  shutdown: () => Promise<void>
  getWorkerPids: () => number[]
}

/**
 * Start a test server instance using the real server creation code
 */
export async function startTestServer(
  options: { workerCountOverride?: number } = {},
): Promise<TestServer> {
  testLogger.info("🚀 Starting test server...")

  // Ensure no orphaned workers from previous tests
  await ensureNoOrphanedWorkers()

  // Use the real server creation code - this will automatically use test configuration
  // since NODE_ENV=test is set by the test runner
  const { app, server, serverApp, workers } = await createApp(options)

  // Track worker processes for cleanup
  testLogger.info(`🔍 Found ${workers?.length || 0} workers to track`)
  if (workers && workers.length > 0) {
    for (const worker of workers) {
      const process = worker.getProcess()
      if (process) {
        testLogger.info(`📝 Tracking worker process ${process.pid}`)
        trackWorkerProcess(process)
      } else {
        testLogger.warn("⚠️  Worker has no process to track")
      }
    }
  }

  // Wait for worker subprocesses to start if workers are enabled
  if (options.workerCountOverride && options.workerCountOverride > 0) {
    testLogger.info(
      `⏳ Waiting for ${options.workerCountOverride} worker subprocesses...`,
    )
    await waitForWorkersReady(options.workerCountOverride, 10000)
    testLogger.info(
      `✅ ${options.workerCountOverride} worker subprocesses ready`,
    )
  }

  // The server will automatically start on the test port (3002)
  // because that's configured in .env.test
  const url = `http://localhost:3002`

  testLogger.info(`✅ Test server started at ${url}`)

  return {
    app,
    server,
    serverApp,
    url,
    getWorkerPids: () => getWorkerProcessPids(),
    shutdown: async () => {
      testLogger.info("🛑 Shutting down test server...")

      try {
        // Stop workers if they exist (this will shutdown subprocesses)
        if (serverApp.queueManager) {
          await serverApp.queueManager.shutdown()
        }

        // Stop the server
        if (server && typeof server.stop === "function") {
          await server.stop()
        }

        // Ensure all worker processes are cleaned up
        await ensureNoOrphanedWorkers()

        testLogger.info("✅ Test server shut down")
      } catch (error) {
        testLogger.error("❌ Error shutting down test server:", error)
        throw error
      }
    },
  }
}

/**
 * Make HTTP request to test server
 */
export async function makeRequest(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  return response
}

/**
 * Wait for server to be ready
 */
export async function waitForServer(
  url: string,
  maxAttempts = 10,
  delayMs = 100,
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await makeRequest(`${url}/health`)
      if (response.ok) {
        return
      }
    } catch {
      // Server not ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  throw new Error(`Server not ready after ${maxAttempts} attempts`)
}
