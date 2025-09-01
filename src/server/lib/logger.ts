import { Logger, LogLevel } from "@hiddentao/logger"
import { ConsoleTransport } from "@hiddentao/logger/transports/console"
import { serverConfig } from "../../shared/config/server"

// Export the Logger type and LogLevel enum for use in other modules
export type { Logger } from "@hiddentao/logger"
export { LogLevel } from "@hiddentao/logger"

// Map our string log levels to LogLevel enum
export const getLogLevel = (level: string): LogLevel => {
  switch (level.toLowerCase()) {
    case "trace":
    case "debug":
      return LogLevel.DEBUG
    case "info":
      return LogLevel.INFO
    case "warn":
      return LogLevel.WARN
    case "error":
      return LogLevel.ERROR
    default:
      return LogLevel.INFO
  }
}

// Create logger factory function
export const createRootLogger = (
  category: string,
  minLevel: LogLevel = getLogLevel(serverConfig.LOG_LEVEL),
) => {
  const logger = new Logger({
    minLevel,
    category,
  })

  // Add console transport with timestamps
  logger.addTransport(new ConsoleTransport({ showTimestamps: true }))

  return logger
}

// Create a dummy/no-op logger for use as a placeholder
export const createDummyLogger = (): Logger => {
  const noop = () => {
    // Intentionally empty no-op function
  }
  return {
    trace: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    child: () => createDummyLogger(),
    // Add missing properties to satisfy Logger interface
    options: {},
    transports: [],
    addTransport: noop,
    log: noop,
    shouldSkipLevel: () => false,
  } as unknown as Logger
}

/**
 * Log categories for consistent logging throughout the application
 */
export const LOG_CATEGORIES = {
  AUTH: "auth",
  GRAPHQL: "graphql",
  GRAPHQL_RESOLVERS: "graphql-resolvers",
  DATABASE: "database",
  WORKER_MANAGER: "worker-manager",
  WORKER: "worker",
} as const

export type LogCategory = (typeof LOG_CATEGORIES)[keyof typeof LOG_CATEGORIES]
