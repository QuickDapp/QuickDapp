import path from "node:path"
import { cors } from "@elysiajs/cors"
import { Elysia } from "elysia"
import { serverConfig, validateConfig } from "../shared/config/env"
import { createServerApp } from "./bootstrap"
import { dbManager } from "./db/connection"
import { createGraphQLHandler } from "./graphql"
import { createLogger } from "./lib/logger"
import type { ServerApp } from "./types"

// Validate environment configuration on startup
validateConfig()

// Create logger instance
const logger = createLogger("server")

// Handle graceful shutdown
const handleShutdown = async () => {
  logger.info("Server shutting down...")

  try {
    // Disconnect from database
    await dbManager.disconnect()
    logger.info("Database disconnected")
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
  process.exit(1)
})

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection at:", promise, "reason:", reason)
  process.exit(1)
})

// Create and start the server
export const createApp = async () => {
  const startTime = performance.now()

  logger.info("Starting QuickDapp v3 server...")

  // Create ServerApp with worker manager
  const bootstrapResult = await createServerApp({ includeWorkerManager: true })

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

      // Log and return 500 for actual server errors
      logger.error(`Unhandled error (Request: ${request.url}):`, error)
      set.status = 500
      return { error: "Internal server error" }
    })
    .use(
      cors({
        origin:
          serverConfig.NODE_ENV === "development"
            ? "*"
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

  // Start the server
  const server = app.listen(
    {
      port: serverConfig.PORT,
      hostname: serverConfig.HOST,
    },
    (server) => {
      const duration = performance.now() - startTime
      logger.info(
        `🚀 QuickDapp v3 server v${serverConfig.APP_VERSION} started in ${duration.toFixed(2)}ms`,
      )
      logger.info(`➜ Running at: ${server.url}`)
      logger.info(`➜ GraphQL endpoint: ${server.url}graphql`)
      logger.info(`➜ Environment: ${serverConfig.NODE_ENV}`)
    },
  )

  return { app, server, serverApp }
}

// Start the application only if this file is run directly
if (import.meta.main) {
  createApp().catch((error) => {
    logger.error("Failed to start server:", error)
    process.exit(1)
  })
}
