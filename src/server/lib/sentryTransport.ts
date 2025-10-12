import type { Transport } from "@hiddentao/logger"
import { LogLevel } from "@hiddentao/logger"
import * as Sentry from "@sentry/node"

const { logger } = Sentry

/**
 * Custom transport for logging to Sentry
 */
export class SentryTransport implements Transport {
  private _minLevel: LogLevel

  constructor(options?: { minLevel?: LogLevel }) {
    this._minLevel = options?.minLevel || LogLevel.ERROR
  }

  write(entry: {
    level: LogLevel
    category?: string
    message: string
    meta?: Record<string, any>
  }): void {
    const { level, category, message, meta } = entry

    if (level < this._minLevel) {
      return
    }

    switch (level) {
      case LogLevel.ERROR:
        logger.error(message, { ...meta, category })
        break
      case LogLevel.WARN:
        logger.warn(message, { ...meta, category })
        break
      case LogLevel.INFO:
        logger.info(message, { ...meta, category })
        break
      case LogLevel.DEBUG:
        logger.debug(message, { ...meta, category })
        break
    }
  }
}
