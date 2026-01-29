/**
 * Test configuration helpers for parallel test execution
 *
 * Provides deterministic resource allocation based on test file index.
 * Index is passed via TEST_FILE_INDEX environment variable from test.ts.
 *
 * IMPORTANT: This module sets process.env.PORT and process.env.DATABASE_URL
 * at load time to ensure serverConfig picks up the correct values.
 */

import { createServer } from "net"

const TEST_PORT_BASE = 54000
const TEST_PORT_FALLBACK_MIN = 55000
const TEST_PORT_FALLBACK_MAX = 59000
const TEST_DB_BASE = "quickdapp_test"

const PG_HOST = "localhost"
const PG_PORT = 55433

/**
 * Get the test file index from environment (synchronous)
 */
export function getTestFileIndex(): number {
  const indexStr = process.env.TEST_FILE_INDEX
  if (!indexStr) {
    return 0
  }
  const index = parseInt(indexStr, 10)
  if (isNaN(index) || index < 0) {
    return 0
  }
  return index
}

/**
 * Get the unique database name for this test file (synchronous)
 * All tests get their own database cloned from the template.
 */
export function getTestDatabaseName(): string {
  const index = getTestFileIndex()
  // All tests get their own database (template database should never have active connections)
  return `${TEST_DB_BASE}_${index}`
}

/**
 * Get the full DATABASE_URL for this test file (synchronous)
 */
export function getTestDatabaseUrl(): string {
  return `postgresql://postgres@${PG_HOST}:${PG_PORT}/${getTestDatabaseName()}`
}

/**
 * Get the preferred test port for this test file (synchronous)
 */
export function getPreferredTestPort(): number {
  return TEST_PORT_BASE + getTestFileIndex()
}

// ============================================================================
// Set environment variables at module load time
// This ensures serverConfig picks up the correct values when it's imported
// ============================================================================

const preferredPort = getPreferredTestPort()
const databaseUrl = getTestDatabaseUrl()

// Set env vars so serverConfig will use them
process.env.PORT = preferredPort.toString()
process.env.DATABASE_URL = databaseUrl
process.env.API_URL = `http://localhost:${preferredPort}`

// ============================================================================
// Async helpers for port checking (called after module load if needed)
// ============================================================================

// Cached port after availability check
let resolvedPort: number | null = preferredPort

/**
 * Check if a port is available by attempting to listen on it
 */
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()
    server.once("error", () => resolve(false))
    server.once("listening", () => {
      server.close()
      resolve(true)
    })
    server.listen(port, "127.0.0.1")
  })
}

/**
 * Get a random port in the fallback range
 */
function getRandomFallbackPort(): number {
  return (
    TEST_PORT_FALLBACK_MIN +
    Math.floor(
      Math.random() * (TEST_PORT_FALLBACK_MAX - TEST_PORT_FALLBACK_MIN),
    )
  )
}

/**
 * Get an available port, checking preferred port first then falling back to random.
 * This is async and should be called when you need to verify port availability.
 * Note: For most cases, the preferred port set at module load time should work.
 */
export async function getTestPort(): Promise<number> {
  if (resolvedPort !== null) return resolvedPort

  const preferred = getPreferredTestPort()

  if (await isPortAvailable(preferred)) {
    resolvedPort = preferred
    return preferred
  }

  // Try random ports until we find an available one
  for (let i = 0; i < 10; i++) {
    const randomPort = getRandomFallbackPort()
    if (await isPortAvailable(randomPort)) {
      resolvedPort = randomPort
      // Update env for consistency
      process.env.PORT = randomPort.toString()
      process.env.API_URL = `http://localhost:${randomPort}`
      return randomPort
    }
  }

  throw new Error("Could not find available port for test server")
}

/**
 * Get the API_URL for this test file
 */
export async function getTestApiUrl(): Promise<string> {
  const port = await getTestPort()
  return `http://localhost:${port}`
}

/**
 * Export all test config as an object
 */
export async function getTestConfig() {
  const port = await getTestPort()
  return {
    TEST_FILE_INDEX: getTestFileIndex(),
    PORT: port,
    DATABASE_URL: getTestDatabaseUrl(),
    API_URL: `http://localhost:${port}`,
    DATABASE_NAME: getTestDatabaseName(),
  }
}

/**
 * Reset the cached port (useful for testing)
 */
export function resetTestPortCache(): void {
  resolvedPort = null
}
