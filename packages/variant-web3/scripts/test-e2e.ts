#!/usr/bin/env bun

import { $ } from "bun"
import {
  type CommandSetup,
  createScriptRunner,
  type ScriptOptions,
} from "./shared/script-runner"

interface E2ETestOptions extends ScriptOptions {
  headed?: boolean
  ui?: boolean
}

async function e2eTestHandler(options: E2ETestOptions) {
  const { headed, ui } = options
  const isCI = !!process.env.CI

  try {
    // In CI, database is provided by service container
    // Locally, start test database container via docker compose
    if (!isCI) {
      console.log("🐳 Starting test database container...")
      try {
        await $`docker compose -f docker-compose.test.yaml up -d --wait`
        console.log("✅ Test database container started")
      } catch (error) {
        console.error("❌ Failed to start test database container:", error)
        process.exit(1)
      }
      console.log("")
    }

    // Set up test database schema
    console.log("📦 Setting up test database...")
    try {
      await $`bun run db push --force`
      console.log("✅ Test database schema updated successfully")
    } catch (error) {
      console.error("❌ Failed to set up test database:", error)
      process.exit(1)
    }
    console.log("")

    // Run Playwright tests
    console.log("🎭 Running E2E tests...")
    const args = ["playwright", "test"]

    if (headed) {
      args.push("--headed")
    }

    if (ui) {
      args.push("--ui")
    }

    const result = await $`bunx ${args}`.nothrow()

    if (result.exitCode !== 0) {
      console.log("")
      console.log("❌ E2E tests failed!")
      process.exit(1)
    }

    console.log("")
    console.log("✅ All E2E tests passed!")
  } catch (error) {
    console.error("❌ E2E test execution failed:", error)
    process.exit(1)
  }
}

const setupE2ECommand: CommandSetup = (program) => {
  return program
    .option("--headed", "run tests in headed browser mode")
    .option("--ui", "run tests in Playwright UI mode")
}

createScriptRunner(
  {
    name: "test:e2e",
    description: "Run E2E browser tests",
    env: "test",
  },
  e2eTestHandler,
  setupE2ECommand,
)
