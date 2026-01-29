#!/usr/bin/env bun

import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { $, Glob, spawn } from "bun"
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
  concurrency?: number
}

interface TestResult {
  file: string
  index: number
  success: boolean
  output: string
  duration: number
}

const TEST_ORDER_FILE = "tests/test-run-order.json"

interface TestOrderEntry {
  file: string
  duration: number
}

interface TestOrderData {
  tests: TestOrderEntry[]
  lastUpdated: string
}

function readTestOrder(): TestOrderData | null {
  try {
    if (!existsSync(TEST_ORDER_FILE)) return null
    const content = readFileSync(TEST_ORDER_FILE, "utf-8")
    return JSON.parse(content) as TestOrderData
  } catch {
    return null
  }
}

function writeTestOrder(results: TestResult[]): void {
  const sorted = [...results].sort((a, b) => b.duration - a.duration)
  const data: TestOrderData = {
    tests: sorted.map((r) => ({
      file: r.file,
      duration: Math.round(r.duration),
    })),
    lastUpdated: new Date().toISOString(),
  }
  writeFileSync(TEST_ORDER_FILE, JSON.stringify(data, null, 2) + "\n")
}

function orderTestsByDuration(
  testFiles: string[],
  orderData: TestOrderData | null,
): string[] {
  if (!orderData) return testFiles

  const durationMap = new Map<string, number>()
  for (const entry of orderData.tests) {
    durationMap.set(entry.file, entry.duration)
  }

  const knownFiles: string[] = []
  const unknownFiles: string[] = []

  for (const file of testFiles) {
    if (durationMap.has(file)) {
      knownFiles.push(file)
    } else {
      unknownFiles.push(file)
    }
  }

  knownFiles.sort((a, b) => durationMap.get(b)! - durationMap.get(a)!)

  return [...knownFiles, ...unknownFiles]
}

async function testHandler(options: TestOptions) {
  const {
    pattern = "",
    timeout = 30000,
    testFile,
    bail = false,
    concurrency = 10,
  } = options

  // Create temporary .env.test.local for debug logging if verbose
  const envTestLocalPath = resolve(process.cwd(), ".env.test.local")
  let createdTempEnvFile = false

  if (options.verbose) {
    console.log("🔧 Creating temporary debug logging configuration...")
    writeFileSync(
      envTestLocalPath,
      `# Temporary debug logging for tests
LOG_LEVEL=debug
WORKER_LOG_LEVEL=debug
`,
    )
    createdTempEnvFile = true
    console.log("✅ Debug logging enabled")
    console.log("")
  }

  // Cleanup function to remove temporary files
  const cleanup = () => {
    if (createdTempEnvFile && existsSync(envTestLocalPath)) {
      console.log("🧹 Cleaning up temporary debug logging configuration...")
      unlinkSync(envTestLocalPath)
      console.log("✅ Temporary files cleaned up")
    }
  }

  // Set up cleanup on exit
  process.on("exit", cleanup)
  process.on("SIGINT", () => {
    cleanup()
    process.exit(0)
  })
  process.on("SIGTERM", () => {
    cleanup()
    process.exit(0)
  })

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
        cleanup()
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
      cleanup()
      process.exit(1)
    }
    console.log("")

    // Mark database as template for parallel execution
    console.log("📋 Marking database as template...")
    try {
      const { markDatabaseAsTemplate } = await import(
        "../tests/helpers/database"
      )
      await markDatabaseAsTemplate()
      console.log("✅ Database marked as template")
    } catch (error) {
      console.error("❌ Failed to mark database as template:", error)
      cleanup()
      process.exit(1)
    }
    console.log("")

    // Get all test files and sort for deterministic indexing
    const testDir = "tests/"
    const glob = new Glob("**/*.test.ts")
    const testFiles: string[] = []
    for await (const file of glob.scan(testDir)) {
      testFiles.push(`${testDir}${file}`)
    }
    testFiles.sort()

    // Determine if this is a full suite run (no filtering)
    const isFullSuiteRun = !testFile && !pattern

    // Read test order data for duration-based ordering
    const orderData = isFullSuiteRun ? readTestOrder() : null

    // Filter and order test files based on options
    let filesToRun: string[]
    if (testFile) {
      filesToRun = [testFile]
    } else if (pattern) {
      filesToRun = testFiles.filter((file) => file.includes(pattern))
    } else {
      // Full suite run - order by duration (longest first)
      filesToRun = orderTestsByDuration(testFiles, orderData)
    }

    if (filesToRun.length === 0) {
      console.log("❌ No test files found matching criteria")
      cleanup()
      process.exit(1)
    }

    const effectiveConcurrency = Math.min(concurrency, filesToRun.length)
    console.log(
      `🚀 Running ${filesToRun.length} test file(s) with concurrency ${effectiveConcurrency}...`,
    )
    for (const file of filesToRun) {
      const index = testFiles.indexOf(file)
      console.log(`   [${index}] ${file}`)
    }
    console.log("")

    // Track results and timing
    const results: TestResult[] = []
    let completedCount = 0
    let failedEarly = false
    const startTime = performance.now()

    // Progress display helper
    const updateProgress = () => {
      const pct = Math.round((completedCount / filesToRun.length) * 100)
      process.stdout.write(
        `\r⏳ Running tests... ${pct}% (${completedCount}/${filesToRun.length})`,
      )
    }

    // Run single test file and capture output
    const runTest = async (file: string): Promise<TestResult> => {
      const index = testFiles.indexOf(file)
      const testStartTime = performance.now()

      const args = ["test", `./${file}`]
      if (timeout) args.push("--timeout", timeout.toString())
      if (options.verbose) args.push("--verbose")
      args.push("--concurrency", "1")

      // Spawn with piped output to capture
      const proc = spawn(["bun", ...args], {
        stdio: ["inherit", "pipe", "pipe"],
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: "test",
          TEST_FILE_INDEX: index.toString(),
        },
      })

      // Collect stdout and stderr
      const decoder = new TextDecoder()

      const readStream = async (
        reader: ReadableStreamDefaultReader<Uint8Array>,
      ): Promise<string> => {
        let result = ""
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          result += decoder.decode(value)
        }
        return result
      }

      const [stdout, stderr] = await Promise.all([
        readStream(proc.stdout.getReader()),
        readStream(proc.stderr.getReader()),
      ])

      const output = stdout + stderr
      const exitCode = await proc.exited
      const duration = performance.now() - testStartTime

      return {
        file,
        index,
        success: exitCode === 0,
        output,
        duration,
      }
    }

    // Run tests with concurrency limit using a promise pool
    const runningPromises: Promise<void>[] = []
    const queue = [...filesToRun]

    const processQueue = async () => {
      while (queue.length > 0 && !failedEarly) {
        // Wait if we've hit the concurrency limit
        if (runningPromises.length >= effectiveConcurrency) {
          await Promise.race(runningPromises)
        }

        const file = queue.shift()
        if (!file) break

        const promise = (async () => {
          const result = await runTest(file)
          results.push(result)
          completedCount++
          updateProgress()

          if (!result.success && bail) {
            failedEarly = true
          }
        })()

        runningPromises.push(promise)
        promise.finally(() => {
          const idx = runningPromises.indexOf(promise)
          if (idx !== -1) runningPromises.splice(idx, 1)
        })
      }

      // Wait for all remaining promises
      await Promise.all(runningPromises)
    }

    await processQueue()

    const totalDuration = performance.now() - startTime

    // Clear progress line
    process.stdout.write("\r" + " ".repeat(60) + "\r")

    // Unmark template database
    try {
      const { unmarkDatabaseAsTemplate } = await import(
        "../tests/helpers/database"
      )
      await unmarkDatabaseAsTemplate()
    } catch (error) {
      console.warn("⚠️ Warning: Failed to unmark database as template:", error)
    }

    // Sort results by index for consistent output
    results.sort((a, b) => a.index - b.index)

    // Show results
    const passed = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)

    console.log("")
    console.log("📊 Test Results:")
    console.log("=".repeat(60))

    for (const result of results) {
      const status = result.success ? "PASS" : "FAIL"
      const statusIcon = result.success ? "✅" : "❌"
      const duration = (result.duration / 1000).toFixed(2)
      console.log(`${statusIcon} [${status}] ${result.file} (${duration}s)`)
    }

    console.log("")
    console.log("📈 Summary:")
    console.log(`   Passed: ${passed.length}`)
    console.log(`   Failed: ${failed.length}`)
    console.log(`   Total:  ${results.length}`)
    console.log(`   Time:   ${(totalDuration / 1000).toFixed(2)}s`)

    // Show failure output
    if (failed.length > 0) {
      console.log("")
      console.log("❌ Failed Test Output:")
      console.log("=".repeat(60))
      for (const result of failed) {
        console.log(`\n--- ${result.file} ---\n`)
        console.log(result.output)
      }

      console.log("")
      console.log("❌ Some tests failed!")
      cleanup()
      process.exit(1)
    }

    console.log("")
    console.log("✅ All tests passed!")

    if (isFullSuiteRun) {
      console.log("")
      console.log("📝 Updating test order file...")
      writeTestOrder(results)
      console.log(`✅ Test order saved to ${TEST_ORDER_FILE}`)
    }

    cleanup()
  } catch (error) {
    console.error("❌ Test execution failed:", error)
    cleanup()
    process.exit(1)
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
    .option("-c, --concurrency <n>", "max concurrent test files", "10")
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
