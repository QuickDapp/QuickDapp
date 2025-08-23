import { Logger, LogLevel } from "@hiddentao/logger"
import { ConsoleTransport } from "@hiddentao/logger/transports/console"
import { serverConfig } from "../../shared/config/server"

// Export the Logger type and LogLevel enum for use in other modules
export type { Logger } from "@hiddentao/logger"
export { LogLevel } from "@hiddentao/logger"

// Map our string log levels to LogLevel enum
const getLogLevel = (level: string): LogLevel => {
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
  minLevel: LogLevel = getLogLevel(serverConfig.LOG_LEVEL),
) => {
  const logger = new Logger({
    minLevel,
  })

  // Add console transport with timestamps
  logger.addTransport(new ConsoleTransport({ showTimestamps: true }))

  return logger
}

// Create the root logger instance
export const logger = createRootLogger()

// Create loggers with categories
export const createLogger = (category: string) => {
  return logger.child(category)
}
