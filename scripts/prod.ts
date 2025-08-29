#!/usr/bin/env bun

import { existsSync } from "node:fs"
import path from "node:path"
import { spawn } from "bun"
import {
  createScriptRunner,
  type ScriptOptions,
  type SubcommandConfig,
} from "./shared/script-runner"

interface ProdOptions extends ScriptOptions {
  // No additional options needed - configuration comes from env
}

async function prodServerHandler(
  _options: ProdOptions,
  config: { rootFolder: string; env: string },
) {
  console.log("🚀 Starting QuickDapp production server...")
  console.log("")

  // Check if production build exists
  const serverBuildPath = path.join(
    config.rootFolder,
    "dist",
    "server",
    "index.js",
  )
  if (!existsSync(serverBuildPath)) {
    console.error(
      "❌ Production build not found. Please run 'bun run build' first.",
    )
    console.log("   Expected: dist/server/index.js")
    process.exit(1)
  }

  console.log("✅ Production build found")
  console.log("🌐 Starting server (serves API and client)...")
  console.log("")

  // Start the production server
  const server = spawn({
    cmd: ["bun", serverBuildPath],
    env: {
      ...process.env,
      NODE_ENV: config.env,
    },
    stdout: "inherit",
    stderr: "inherit",
  })

  // Handle graceful shutdown
  const handleShutdown = () => {
    console.log("\n🛑 Shutting down production server...")
    server.kill()
    process.exit(0)
  }

  process.on("SIGINT", handleShutdown)
  process.on("SIGTERM", handleShutdown)

  await server.exited
}

async function prodClientHandler(
  _options: ProdOptions,
  config: { rootFolder: string; env: string },
) {
  console.log("🎨 Starting QuickDapp production client preview...")
  console.log("")

  // Check if client build exists
  const clientBuildPath = path.join(config.rootFolder, "dist", "client")
  if (!existsSync(clientBuildPath)) {
    console.error(
      "❌ Client build not found. Please run 'bun run build' first.",
    )
    console.log("   Expected: dist/client/")
    process.exit(1)
  }

  console.log("✅ Client build found")
  console.log("🌐 Starting Vite preview server...")
  console.log("")

  // Start Vite preview server for client build
  const vite = spawn({
    cmd: ["bun", "vite", "preview"],
    cwd: path.join(config.rootFolder, "src/client"),
    env: {
      ...process.env,
      NODE_ENV: config.env,
    },
    stdout: "inherit",
    stderr: "inherit",
  })

  // Handle graceful shutdown
  const handleShutdown = () => {
    console.log("\n🛑 Shutting down client preview server...")
    vite.kill()
    process.exit(0)
  }

  process.on("SIGINT", handleShutdown)
  process.on("SIGTERM", handleShutdown)

  await vite.exited
}

// Define subcommands
const subcommands: SubcommandConfig[] = [
  {
    name: "client",
    description: "Run client preview server only",
    handler: prodClientHandler,
  },
]

// Create script runner with default server handler and optional client subcommand
createScriptRunner(
  {
    name: "prod",
    description: "Run QuickDapp in production mode",
    env: "production",
    subcommands,
  },
  prodServerHandler, // Default handler when no subcommand is specified
)
