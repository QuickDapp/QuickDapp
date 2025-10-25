#!/usr/bin/env bun

import { $ } from "bun"
import {
  createScriptRunner,
  type ScriptOptions,
  type SubcommandConfig,
} from "./shared/script-runner"

interface DbOptions extends ScriptOptions {}

async function runDrizzleCommand(args: string[]): Promise<void> {
  // Use tee to both display output and capture it
  const tempFile = `/tmp/drizzle-output-${Date.now()}.txt`

  try {
    // Run command with tee to capture output while showing it
    await $`drizzle-kit ${args} 2>&1 | tee ${tempFile}`.nothrow()

    // Read captured output for error checking
    const result = await $`cat ${tempFile}`.text()

    // Check for error patterns in output regardless of exit code
    if (
      result.includes("PostgresError") ||
      result.includes("ERROR") ||
      result.includes("permission denied")
    ) {
      throw new Error("Command failed with database error")
    }
  } finally {
    // Clean up temp file
    await $`rm -f ${tempFile}`.nothrow()
  }
}

async function generateHandler(
  _options: DbOptions,
  _config: { rootFolder: string; env: string },
) {
  console.log("🔧 Generating DrizzleORM migrations...")
  try {
    await runDrizzleCommand(["generate"])
    console.log("✅ Migrations generated successfully")
  } catch (error) {
    console.error("❌ Failed to generate migrations:", error)
    process.exit(1)
  }
}

async function pushHandler(
  _options: DbOptions,
  _config: { rootFolder: string; env: string },
) {
  console.log("🚀 Applying migrations to database...")
  try {
    await runDrizzleCommand(["migrate"])
    console.log("✅ Migrations applied successfully")
  } catch (error) {
    console.error("❌ Failed to apply migrations:", error)
    process.exit(1)
  }
}

// Define subcommands
const subcommands: SubcommandConfig[] = [
  {
    name: "generate",
    description: "Generate DrizzleORM migrations",
    handler: generateHandler,
  },
  {
    name: "push",
    description: "Apply migration files to database",
    handler: pushHandler,
  },
]

// Create script runner with subcommands
createScriptRunner({
  name: "db",
  description: "Database management utilities",
  env: process.env.NODE_ENV || "development",
  subcommands,
})
