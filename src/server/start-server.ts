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
import type { ServerApp } from "./types"
import { createWebSocket, SocketManager } from "./ws"

// Create and start the server
export const createApp = async (
  options: { workerCountOverride?: number } = {},
) => {
  const startTime = performance.now()

  // Create root logger instance
  const logger = createRootLogger("server")

  // Handle graceful shutdown
  const handleShutdown = async () => {
    logger.info("Server shutting down...")

    try {
      // Disconnect from database
      await dbManager.disconnect()
      logger.info("Database disconnected")

      // Flush Sentry events if enabled
      if (serverConfig.SENTRY_DSN) {
        await Sentry.close(2000)
        logger.info("Sentry events flushed")
      }
    } catch (error) {
      logger.error("Error during shutdown:", error)
    }

    process.exit(0)
  }

  // Register shutdown handlers
  process.on("SIGINT", handleShutdown)
  process.on("SIGTERM", handleShutdown)

  // Handle uncaught exceptions
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

  logger.info("Starting QuickDapp server...")

  // Create SocketManager
  const socketManager = new SocketManager(logger)

  // Create ServerApp with worker manager
  const bootstrapResult = await createServerApp({
    includeWorkerManager: true,
    workerCountOverride: options.workerCountOverride,
    socketManager,
    rootLogger: logger,
  })

  // Create base Elysia app
  const app = new Elysia({
    websocket: {
      idleTimeout: 120,
      perMessageDeflate: true,
    },
  })

  // Create the complete ServerApp instance
  const serverApp: ServerApp = {
    ...bootstrapResult,
    app,
    workerManager: bootstrapResult.workerManager!,
  }

  logger.info(
    `Worker manager initialized with ${serverConfig.WORKER_COUNT} workers`,
  )

  // Configure Elysia app
  app
    .onError(({ error, set, request }) => {
      // Handle NOT_FOUND errors as 404s
      if (
        (error as Error)?.message === "NOT_FOUND" ||
        (error as any)?.code === "NOT_FOUND"
      ) {
        set.status = 404
        return { error: "Not found" }
      }

      // Capture exception in Sentry
      Sentry.captureException(error)

      // Log and return 500 for actual server errors
      logger.error(`Unhandled error (Request: ${request.url}):`, error)
      set.status = 500
      return { error: "Internal server error" }
    })
    .use(
      cors({
        origin:
          serverConfig.NODE_ENV === "development"
            ? [
                "http://localhost:5173",
                "http://localhost:3000",
                serverConfig.BASE_URL,
              ]
            : [serverConfig.BASE_URL],
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        credentials: true,
      }),
    )
    // Health check endpoint
    .get("/health", () => ({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: serverConfig.APP_VERSION,
    }))
    // Version endpoint
    .get("/version", () => ({
      version: serverConfig.APP_VERSION,
      name: "QuickDapp",
      environment: serverConfig.NODE_ENV,
    }))
    // Chrome DevTools integration for development
    .get("/.well-known/appspecific/com.chrome.devtools.json", () => {
      if (serverConfig.NODE_ENV === "development") {
        return {
          workspace: {
            root: path.join(__dirname, "..", ".."),
            uuid: "quickdapp-v3-server",
          },
        }
      }
      return new Response(null, { status: 204 })
    })
    // Favicon handler
    .get("/favicon.ico", () => new Response(null, { status: 204 }))

  // Add GraphQL endpoint
  app.use(createGraphQLHandler(serverApp))

  // Add WebSocket endpoint
  app.use(createWebSocket(serverApp))

  // Serve static assets from Vite build (or configurable location)
  const staticDir =
    serverConfig.STATIC_ASSETS_FOLDER || path.join(import.meta.dir, "static")
  app.use(
    staticPlugin({
      assets: staticDir,
      prefix: "",
      indexHTML: true,
      alwaysStatic: true,
      noCache: true,
    }),
  )

  app.head("/", () => {
    return new Response(null, { status: 200 })
  })

  // Start the server
  const server = app.listen(
    {
      port: serverConfig.PORT,
      hostname: serverConfig.HOST,
    },
    (server) => {
      const duration = performance.now() - startTime
      logger.info(
        `🚀 QuickDapp server v${serverConfig.APP_VERSION} started in ${duration.toFixed(2)}ms`,
      )
      logger.info(`➜ Running at: ${server.url}`)
      logger.info(`➜ GraphQL endpoint: ${server.url}graphql`)
      logger.info(`➜ Environment: ${serverConfig.NODE_ENV}`)
    },
  )

  return { app, server, serverApp }
}
