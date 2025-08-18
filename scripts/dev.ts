#!/usr/bin/env bun

import { spawn } from "bun"
import { createScriptRunner, type ScriptOptions } from "./shared/script-runner"

interface DevOptions extends ScriptOptions {
  // No additional options needed - host/port come from env
}

async function devHandler(_options: DevOptions, config: { rootFolder: string; env: string }) {
  console.log('🚀 Starting QuickDapp v3 development server...')
  console.log('')

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

  // Handle graceful shutdown
  const handleShutdown = () => {
    console.log('\n🛑 Shutting down development server...')
    server.kill()
    process.exit(0)
  }

  process.on('SIGINT', handleShutdown)
  process.on('SIGTERM', handleShutdown)

  // Wait for server process
  await server.exited
}

// Create script runner
export const { runScript: runDev } = createScriptRunner(
  {
    name: "dev",
    description: "Start the development server with auto-restart on file changes",
    env: "development",
  },
  devHandler
)