#!/usr/bin/env bun

import { $ } from "bun"
import {
  createScriptRunner,
  type ScriptOptions,
  type SubcommandConfig,
} from "./shared/script-runner"

interface DbOptions extends ScriptOptions {
  force?: boolean
}

async function generateHandler(
  _options: DbOptions,
  _config: { rootFolder: string; env: string },
) {
  console.log("🔧 Generating DrizzleORM migrations...")
  await $`drizzle-kit generate`
  console.log("✅ Migrations generated successfully")
}

async function migrateHandler(
  _options: DbOptions,
  _config: { rootFolder: string; env: string },
) {
  console.log("🚀 Running DrizzleORM migrations...")
  await $`drizzle-kit migrate`
  console.log("✅ Migrations applied successfully")
}

async function pushHandler(
  options: DbOptions,
  _config: { rootFolder: string; env: string },
) {
  console.log("📦 Pushing schema changes to database...")
  if (options.force) {
    await $`drizzle-kit push --force`
  } else {
    await $`drizzle-kit push`
  }
  console.log("✅ Schema changes pushed successfully")
}

// Define subcommands
const subcommands: SubcommandConfig[] = [
  {
    name: "generate",
    description: "Generate DrizzleORM migrations",
    handler: generateHandler,
  },
  {
    name: "migrate",
    description: "Run DrizzleORM migrations",
    handler: migrateHandler,
  },
  {
    name: "push",
    description: "Push schema changes to database",
    handler: pushHandler,
    options: (cmd) => cmd.option("-f, --force", "force the operation"),
  },
]

// Create script runner with subcommands
createScriptRunner({
  name: "db",
  description: "Database management utilities",
  env: "development",
  subcommands,
})
