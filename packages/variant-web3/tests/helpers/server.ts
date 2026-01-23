/**
 * Server test helpers for QuickDapp
 *
 * Utilities for starting/stopping test servers, making requests,
 * and managing test server lifecycle.
 */

// Side-effect import: sets env vars before serverConfig loads
import "./test-config"

import { createApp } from "../../src/server/start-server"
import type { ServerApp } from "../../src/server/types"
import { testLogger } from "./logger"
import { getTestPort } from "./test-config"

export interface TestServer {
  app: any
  server: any
  serverApp: ServerApp
  url: string
  shutdown: () => Promise<void>
}

/**
 * Start a test server instance using the real server creation code
 * Uses dynamic port based on test file index for parallel execution
 *
 * Note: Environment variables (PORT, DATABASE_URL, API_URL) are already set
 * by test-config.ts at module load time, so serverConfig will have correct values.
 */
export async function startTestServer(
  options: { workerCountOverride?: number } = {},
): Promise<TestServer> {
  // Port and database URL are already set in process.env by test-config.ts
  const port = await getTestPort()
  const url = `http://localhost:${port}`

  testLogger.info(`🚀 Starting test server on port ${port}...`)

  const { app, server, serverApp } = await createApp(options)

  testLogger.info(`✅ Test server started at ${url}`)

  return {
    app,
    server,
    serverApp,
    url,
    shutdown: async () => {
      testLogger.info("🛑 Shutting down test server...")

      try {
        // Stop the server - pass true to close immediately without waiting for connections
        if (server && typeof server.stop === "function") {
          server.stop(true)
        }

        // Stop workers if they exist
        if (serverApp.workerManager) {
          await serverApp.workerManager.shutdown()
        }

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
