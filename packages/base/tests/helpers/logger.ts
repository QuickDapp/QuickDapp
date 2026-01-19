/**
 * Test logger helper
 *
 * Provides a singleton logger instance for all test files
 * Uses the test-logger category with severity level from serverConfig
 */

// Side-effect import: sets env vars before serverConfig loads
import "./test-config"

import { createRootLogger } from "../../src/server/lib/logger"

// Singleton test logger instance
const rootLogger = createRootLogger("test")
export const testLogger = rootLogger.child("test-logger")
