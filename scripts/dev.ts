#!/usr/bin/env bun

import { existsSync } from "node:fs"
import path from "node:path"
import { spawn } from "bun"
import { copyStaticSrc } from "./shared/copy-static-src"
import { generateAbis } from "./shared/generate-abis"
import { createDevRedisManager } from "./shared/redis-manager"
import { createScriptRunner, type ScriptOptions } from "./shared/script-runner"

interface DevOptions extends ScriptOptions {
  // No additional options needed - host/port come from env
}

async function devHandler(
  options: DevOptions,
  config: { rootFolder: string; env: string },
) {
  console.log("🚀 Starting QuickDapp development server...")
  console.log("")

  // Check for sample contracts and provide helpful message
  const envLocalPath = path.join(config.rootFolder, ".env.local")
  if (!existsSync(envLocalPath)) {
    console.log("💡 Tip: Deploy sample contracts with:")
    console.log("   cd sample-contracts && bun deploy.ts")
    console.log("")
  }

  // Check Redis connection for development
  const redisManager = createDevRedisManager(options.verbose)
  console.log("📦 Checking Redis connection for job queue...")
  try {
    await redisManager.checkConnection()
    console.log("✅ Redis ready for job processing")
  } catch (error) {
    console.error("❌ Redis connection failed:", error)
    process.exit(1)
  }
  console.log("")

  // Copy static-src to static
  copyStaticSrc(config.rootFolder, true)

  // Generate ABIs
  console.log("🔧 Generating ABIs...")
  try {
    await generateAbis({ verbose: false })
    console.log("✅ ABIs generated")
  } catch (error) {
    console.warn("⚠️  ABI generation failed, using defaults:", error)
  }
  console.log("")

  // Start the server with watch mode
  const server = spawn({
    cmd: ["bun", "--watch", "src/server/index.ts"],
    env: {
      ...process.env,
      NODE_ENV: config.env,
    },
    stdout: "inherit",
    stderr: "inherit",
  })

  // Start Vite dev server for frontend
  const vite = spawn({
    cmd: ["bun", "vite", "dev"],
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
    console.log("\n🛑 Shutting down development servers...")
    server.kill()
    vite.kill()
    process.exit(0)
  }

  process.on("SIGINT", handleShutdown)
  process.on("SIGTERM", handleShutdown)

  await Promise.all([server.exited, vite.exited])
}

// Create script runner
export const { runScript: runDev } = createScriptRunner(
  {
    name: "dev",
    description:
      "Start the development server with auto-restart on file changes",
    env: "development",
  },
  devHandler,
)
