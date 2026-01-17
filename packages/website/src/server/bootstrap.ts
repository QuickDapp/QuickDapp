import { serverConfig } from "@shared/config/server"
import { dbManager } from "./db/connection"
import type { Logger } from "./lib/logger"
import { startSpan } from "./lib/logger"
import type { ServerApp } from "./types"
import { createWorkerManager } from "./workers"

export const createServerApp = async (options: {
  includeWorkerManager?: boolean
  workerCountOverride?: number
  rootLogger: Logger
}): Promise<
  Omit<ServerApp, "app" | "workerManager"> & {
    workerManager?: ServerApp["workerManager"]
  }
> => {
  const {
    includeWorkerManager = false,
    workerCountOverride,
    rootLogger,
  } = options

  dbManager.setLogger(rootLogger.child("db-manager"))

  const db = await dbManager.connect({
    maxConnections: 10,
    idleTimeout: 20,
    connectTimeout: 10,
    databaseUrl: serverConfig.DATABASE_URL,
  })

  rootLogger.info("Database connected")

  const baseServerApp = {
    db,
    rootLogger,
    createLogger: (category: string) => rootLogger.child(category),
    startSpan,
  }

  if (includeWorkerManager) {
    return {
      ...baseServerApp,
      workerManager: await createWorkerManager(
        baseServerApp as any,
        workerCountOverride,
      ),
    }
  }

  return baseServerApp
}
