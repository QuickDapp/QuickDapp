import path from "node:path"
import { cors } from "@elysiajs/cors"
import { staticPlugin } from "@elysiajs/static"
import * as Sentry from "@sentry/node"
import { serverConfig } from "@shared/config/server"
import { Elysia } from "elysia"
import { createServerApp } from "./bootstrap"
import { dbManager } from "./db/connection"
import { createGraphQLHandler } from "./graphql"
import { createRootLogger } from "./lib/logger"
import { initializeSentry } from "./lib/sentry"
import type { ServerApp } from "./types"

export const createApp = async (
  options: { workerCountOverride?: number } = {},
) => {
  if (serverConfig.SENTRY_DSN) {
    initializeSentry({
      dsn: serverConfig.SENTRY_DSN,
      environment: serverConfig.NODE_ENV,
      tracesSampleRate: serverConfig.SENTRY_TRACES_SAMPLE_RATE,
      profileSessionSampleRate: serverConfig.SENTRY_PROFILE_SESSION_SAMPLE_RATE,
    })
  }

  const startTime = performance.now()
  const logger = createRootLogger("server")

  const handleShutdown = async () => {
    logger.info("Server shutting down...")

    try {
      await dbManager.disconnect()
      logger.info("Database disconnected")

      if (serverConfig.SENTRY_DSN) {
        await Sentry.close(2000)
        logger.info("Sentry events flushed")
      }
    } catch (error) {
      logger.error("Error during shutdown:", error)
    }

    process.exit(0)
  }

  process.on("SIGINT", handleShutdown)
  process.on("SIGTERM", handleShutdown)

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception:", error)
    Sentry.captureException(error)
    process.exit(1)
  })

  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled rejection at:", promise, "reason:", reason)
    Sentry.captureException(reason)
    process.exit(1)
  })

  logger.info("Starting QuickDapp website server...")

  const bootstrapResult = await createServerApp({
    includeWorkerManager: true,
    workerCountOverride: options.workerCountOverride,
    rootLogger: logger,
  })

  const app = new Elysia()

  const serverApp: ServerApp = {
    ...bootstrapResult,
    app,
    workerManager: bootstrapResult.workerManager!,
  }

  logger.info(
    `Worker manager initialized with ${serverConfig.WORKER_COUNT} workers`,
  )

  app
    .onError(({ error, set, request }) => {
      if (
        (error as Error)?.message === "NOT_FOUND" ||
        (error as any)?.code === "NOT_FOUND"
      ) {
        set.status = 404
        return { error: "Not found" }
      }

      Sentry.captureException(error)
      logger.error(`Unhandled error (Request: ${request.url}):`, error)
      set.status = 500
      return { error: "Internal server error" }
    })
    .use(
      cors({
        origin: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        credentials: true,
      }),
    )
    .get("/health", () => ({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: serverConfig.APP_VERSION,
      name: serverConfig.APP_NAME,
      environment: serverConfig.NODE_ENV,
    }))
    .get("/.well-known/appspecific/com.chrome.devtools.json", () => {
      if (serverConfig.NODE_ENV === "development") {
        return {
          workspace: {
            root: path.join(__dirname, "..", ".."),
            uuid: "quickdapp-website",
          },
        }
      }
      return new Response(null, { status: 204 })
    })

  app.use(createGraphQLHandler(serverApp))

  const staticDir =
    serverConfig.STATIC_ASSETS_FOLDER || path.join(import.meta.dir, "static")

  // Serve index.html for root path (SPA entry point)
  app.get("/", async ({ set }) => {
    const indexPath = path.join(staticDir, "index.html")
    const file = Bun.file(indexPath)
    if (await file.exists()) {
      set.headers["content-type"] = "text/html; charset=utf-8"
      return file
    }
    set.status = 404
    return "Not found"
  })

  app.use(
    staticPlugin({
      assets: staticDir,
      prefix: "",
      indexHTML: false,
      alwaysStatic: true,
    }),
  )

  app.get("/*", async ({ set, path: reqPath }) => {
    if (reqPath.includes(".")) {
      set.status = 404
      return "Not found"
    }
    const indexPath = path.join(staticDir, "index.html")
    const file = Bun.file(indexPath)
    if (await file.exists()) {
      set.headers["content-type"] = "text/html; charset=utf-8"
      return file
    }
    set.status = 404
    return "Not found"
  })

  const server = app.listen(
    {
      port: serverConfig.PORT,
      hostname: serverConfig.HOST,
    },
    (server) => {
      const duration = performance.now() - startTime
      logger.info(
        `🚀 QuickDapp website v${serverConfig.APP_VERSION} started in ${duration.toFixed(2)}ms`,
      )
      logger.info(`➜ Running at: ${server.url}`)
      logger.info(`➜ GraphQL endpoint: ${server.url}graphql`)
      logger.info(`➜ Environment: ${serverConfig.NODE_ENV}`)
    },
  )

  return { app, server, serverApp }
}
