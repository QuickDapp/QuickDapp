#!/usr/bin/env bun

import { existsSync, unlinkSync, writeFileSync } from "node:fs"
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

async function testHandler(options: TestOptions) {
  const {
    pattern = "",
    timeout = 30000,
    testFile,
    bail = false,
    concurrency = 10,
  } = options

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

  const cleanup = () => {
    if (createdTempEnvFile && existsSync(envTestLocalPath)) {
      console.log("🧹 Cleaning up temporary debug logging configuration...")
      unlinkSync(envTestLocalPath)
      console.log("✅ Temporary files cleaned up")
    }
  }

  process.on("exit", cleanup)
  process.on("SIGINT", () => {
    cleanup()
    process.exit(0)
  })
  process.on("SIGTERM", () => {
    cleanup()
    process.exit(0)
  })

  try {
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

    const testDir = "tests/"
    const glob = new Glob("**/*.test.ts")
    const testFiles: string[] = []
    for await (const file of glob.scan(testDir)) {
      testFiles.push(`${testDir}${file}`)
    }
    testFiles.sort()

    let filesToRun = testFiles
    if (testFile) {
      filesToRun = [testFile]
    } else if (pattern) {
      filesToRun = testFiles.filter((file) => file.includes(pattern))
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

    const results: TestResult[] = []
    let completedCount = 0
    let failedEarly = false
    const startTime = performance.now()

    const updateProgress = () => {
      const pct = Math.round((completedCount / filesToRun.length) * 100)
      process.stdout.write(
        `\r⏳ Running tests... ${pct}% (${completedCount}/${filesToRun.length})`,
      )
    }

    const runTest = async (file: string): Promise<TestResult> => {
      const index = testFiles.indexOf(file)
      const testStartTime = performance.now()

      const args = ["test", `./${file}`]
      if (timeout) args.push("--timeout", timeout.toString())
      if (options.verbose) args.push("--verbose")
      args.push("--concurrency", "1")

      const proc = spawn(["bun", ...args], {
        stdio: ["inherit", "pipe", "pipe"],
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: "test",
          TEST_FILE_INDEX: index.toString(),
        },
      })

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

    const runningPromises: Promise<void>[] = []
    const queue = [...filesToRun]

    const processQueue = async () => {
      while (queue.length > 0 && !failedEarly) {
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

      await Promise.all(runningPromises)
    }

    await processQueue()

    const totalDuration = performance.now() - startTime

    process.stdout.write("\r" + " ".repeat(60) + "\r")

    try {
      const { unmarkDatabaseAsTemplate } = await import(
        "../tests/helpers/database"
      )
      await unmarkDatabaseAsTemplate()
    } catch (error) {
      console.warn("⚠️ Warning: Failed to unmark database as template:", error)
    }

    results.sort((a, b) => a.index - b.index)

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
    cleanup()
  } catch (error) {
    console.error("❌ Test execution failed:", error)
    cleanup()
    process.exit(1)
  }
}

const setupTestCommand: CommandSetup = (program) => {
  return program
    .option("-p, --pattern <pattern>", "test pattern to match")
    .option("-f, --test-file <file>", "specific test file to run")
    .option("-w, --watch", "run tests in watch mode")
    .option("-t, --timeout <ms>", "test timeout in milliseconds", "30000")
    .option("-b, --bail", "stop on first test failure")
    .option("-c, --concurrency <n>", "max concurrent test files", "10")
}

createScriptRunner(
  {
    name: "test",
    description: "Run the test suite",
    env: "test",
  },
  testHandler,
  setupTestCommand,
)
