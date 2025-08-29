#!/usr/bin/env bun

import { existsSync } from "node:fs"
import path from "node:path"
import { spawn } from "bun"
import { Command } from "commander"
import { bootstrap } from "./shared/bootstrap"
import type { ScriptOptions } from "./shared/script-runner"

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

async function runProd<T extends ScriptOptions = ScriptOptions>(
  handler: (
    options: T,
    config: { rootFolder: string; env: string },
  ) => Promise<void>,
  options: T,
): Promise<void> {
  try {
    // Bootstrap environment
    const config = await bootstrap({
      env: "production",
      verbose: options.verbose || false,
    })

    // Run the actual handler
    await handler(options, config)
  } catch (error) {
    console.error("❌ prod failed:", error)
    process.exit(1)
  }
}

// Set up Commander program with subcommands
const program = new Command()

program
  .name("prod")
  .description("Run QuickDapp in production mode")
  .option("-v, --verbose", "enable verbose output")

// Default command (no subcommand) - runs server
program.action(async (options: ProdOptions) => {
  await runProd(prodServerHandler, options)
})

// Client subcommand - runs client preview only
program
  .command("client")
  .description("Run client preview server only")
  .option("-v, --verbose", "enable verbose output")
  .action(async (options: ProdOptions) => {
    await runProd(prodClientHandler, options)
  })

program.parseAsync()
