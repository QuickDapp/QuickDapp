#!/usr/bin/env bun

import { $, spawn } from "bun"
import {
  type CommandSetup,
  createScriptRunner,
  type ScriptOptions,
} from "./shared/script-runner"

interface TestOptions extends ScriptOptions {
  pattern?: string
  watch?: boolean
  timeout?: number
  testFile?: string
  bail?: boolean
  serial?: boolean
}

async function testHandler(options: TestOptions) {
  const {
    pattern = "",
    watch = false,
    timeout = 30000,
    testFile,
    bail = false,
    serial = false,
  } = options

  // Set up test database first
  console.log("📦 Setting up test database...")
  try {
    await $`bun run db:push --force`
    console.log("✅ Test database schema updated successfully")
  } catch (error) {
    console.error("❌ Failed to set up test database:", error)
    process.exit(1)
  }
  console.log("")

  // Prepare test command arguments
  const args = ["test"]

  if (testFile) {
    args.push(testFile)
  } else if (pattern) {
    // Run pattern against our test files only
    args.push("tests/")
    args.push("--pattern", pattern)
  } else {
    // Only run tests in our tests/ directory
    args.push("tests/")
  }

  if (watch) {
    args.push("--watch")
  }

  if (timeout) {
    args.push("--timeout", timeout.toString())
  }

  if (options.verbose) {
    args.push("--verbose")
  }

  if (bail) {
    args.push("--bail")
  }

  if (serial) {
    args.push("--concurrency", "1")
  }

  console.log("🚀 Running tests...")
  console.log(`   Command: bun ${args.join(" ")}`)
  console.log("")

  // Run tests
  const result = await spawn(["bun", ...args], {
    stdio: ["inherit", "inherit", "inherit"],
    env: {
      ...process.env,
      NODE_ENV: "test", // Force test environment
    },
  }).exited

  if (result === 0) {
    console.log("")
    console.log("✅ Tests completed successfully!")
  } else {
    console.log("")
    console.log("❌ Tests failed!")
    process.exit(result)
  }
}

// Command setup function for test-specific options
const setupTestCommand: CommandSetup = (program) => {
  return program
    .option("-p, --pattern <pattern>", "test pattern to match")
    .option("-f, --test-file <file>", "specific test file to run")
    .option("-w, --watch", "run tests in watch mode")
    .option("-t, --timeout <ms>", "test timeout in milliseconds", "30000")
    .option("-b, --bail", "stop on first test failure")
    .option("-s, --serial", "run tests serially (one at a time)")
}

// Create script runner
createScriptRunner(
  {
    name: "test",
    description: "Run the test suite",
    env: "test",
  },
  testHandler,
  setupTestCommand,
)
