import path from "node:path"
import { cors } from "@elysiajs/cors"
import { staticPlugin } from "@elysiajs/static"
import { Elysia } from "elysia"
import { serverConfig } from "../shared/config/env"
import { createServerApp } from "./bootstrap"
import { dbManager } from "./db/connection"
import { createGraphQLHandler } from "./graphql"
import { createLogger } from "./lib/logger"
import type { ServerApp } from "./types"

// Create and start the server
export const createApp = async () => {
  const startTime = performance.now()

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

  // Serve static assets from Vite build
  const staticDir = path.join(import.meta.dir, "static", "dist")
  app.use(
    staticPlugin({
      assets: staticDir,
      prefix: "/assets",
      noCache: serverConfig.NODE_ENV === "development",
    }),
  )

  // Serve index.html for SPA routes (catch-all for frontend routing)
  app.get("/*", async ({ set, path: requestPath }) => {
    // Skip API routes and assets
    if (
      requestPath.startsWith("/api") ||
      requestPath.startsWith("/graphql") ||
      requestPath.startsWith("/assets")
    ) {
      set.status = 404
      return { error: "Not found" }
    }

    // Read and serve index.html with injected config
    try {
      const indexPath = path.join(staticDir, "index.html")
      const { readFileSync } = await import("node:fs")
      const indexHtml = readFileSync(indexPath, "utf8")

      // Inject client config into the HTML
      const configScript = `<script>window.__CONFIG__ = ${JSON.stringify({
        BASE_URL: serverConfig.BASE_URL,
        CHAIN: serverConfig.CHAIN,
        FACTORY_CONTRACT_ADDRESS: serverConfig.FACTORY_CONTRACT_ADDRESS,
        WALLETCONNECT_PROJECT_ID: serverConfig.WALLETCONNECT_PROJECT_ID,
      })};</script>`

      const htmlWithConfig = indexHtml.replace(
        "</head>",
        `${configScript}\n  </head>`,
      )

      set.headers["Content-Type"] = "text/html"
      return new Response(htmlWithConfig)
    } catch {
      // If frontend hasn't been built yet, show development message
      if (serverConfig.NODE_ENV === "development") {
        set.headers["Content-Type"] = "text/html"
        return new Response(`
          <!DOCTYPE html>
          <html>
            <head><title>QuickDapp v3</title></head>
            <body>
              <div style="margin: 2rem; font-family: system-ui;">
                <h1>QuickDapp v3 Development Server</h1>
                <p>The frontend hasn't been built yet. To start the frontend:</p>
                <ol>
                  <li>Run <code>cd src/client && bun run dev</code> in another terminal</li>
                  <li>Or build the frontend with <code>bun run build</code></li>
                </ol>
                <p>GraphQL endpoint: <a href="/graphql">/graphql</a></p>
                <p>Health check: <a href="/health">/health</a></p>
              </div>
            </body>
          </html>
        `)
      }

      set.status = 500
      return { error: "Frontend assets not found" }
    }
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
        `🚀 QuickDapp v3 server v${serverConfig.APP_VERSION} started in ${duration.toFixed(2)}ms`,
      )
      logger.info(`➜ Running at: ${server.url}`)
      logger.info(`➜ GraphQL endpoint: ${server.url}graphql`)
      logger.info(`➜ Environment: ${serverConfig.NODE_ENV}`)
    },
  )

  return { app, server, serverApp }
}

// This file is imported by src/server/index.ts for server functionality
