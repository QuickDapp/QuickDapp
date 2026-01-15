import { Logger, LogLevel } from "@hiddentao/logger"
import { ConsoleTransport } from "@hiddentao/logger/transports/console"
import * as Sentry from "@sentry/node"
import { serverConfig } from "../../shared/config/server"
import { SentryTransport } from "./sentry"

export type { Logger } from "@hiddentao/logger"
export { LogLevel } from "@hiddentao/logger"

let sentryInitialized = false
if (!sentryInitialized && serverConfig.SENTRY_DSN) {
  sentryInitialized = true
  Sentry.init({
    dsn: serverConfig.SENTRY_DSN,
    environment: serverConfig.NODE_ENV,
    tracesSampleRate: serverConfig.SENTRY_TRACES_SAMPLE_RATE,
    profileSessionSampleRate: serverConfig.SENTRY_PROFILE_SESSION_SAMPLE_RATE,
    sendDefaultPii: true,
    _experiments: {
      enableLogs: true,
    },
  })
}

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

export const createRootLogger = (
  category: string,
  minLevel: LogLevel = getLogLevel(serverConfig.LOG_LEVEL),
) => {
  const logger = new Logger({
    minLevel,
    category,
  })

  logger.addTransport(new ConsoleTransport({ showTimestamps: true }))

  if (serverConfig.SENTRY_DSN) {
    logger.addTransport(new SentryTransport())
  }

  return logger
}

export const createDummyLogger = (): Logger => {
  const noop = () => {
    /* no-op */
  }
  return {
    trace: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    child: () => createDummyLogger(),
    options: {},
    transports: [],
    addTransport: noop,
    log: noop,
    shouldSkipLevel: () => false,
  } as unknown as Logger
}

export const LOG_CATEGORIES = {
  GRAPHQL: "graphql",
  GRAPHQL_RESOLVERS: "graphql-resolvers",
  DATABASE: "database",
  WORKER_MANAGER: "worker-manager",
  WORKER: "worker",
} as const

export type LogCategory = (typeof LOG_CATEGORIES)[keyof typeof LOG_CATEGORIES]

export const startSpan = async <T>(
  operation: string,
  cb: (span: Sentry.Span) => Promise<T>,
): Promise<T> => {
  const spanContext = {
    name: operation,
    op: operation,
  }

  return Sentry.startSpan(spanContext, cb)
}
