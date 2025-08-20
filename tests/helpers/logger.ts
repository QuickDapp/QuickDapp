/**
 * Test logger helper
 *
 * Provides a singleton logger instance for all test files
 * Uses the test-logger category with severity level from serverConfig
 */

import { createLogger } from "../../src/server/lib/logger"

// Singleton test logger instance
export const testLogger = createLogger("test-logger")
