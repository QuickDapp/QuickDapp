/**
 * Test logger helper
 *
 * Provides a singleton logger instance for all test files
 * Uses the test-logger category with severity level from serverConfig
 */

import "./test-config"

import { createRootLogger } from "../../src/server/lib/logger"

const rootLogger = createRootLogger("test")
export const testLogger = rootLogger.child("test-logger")
