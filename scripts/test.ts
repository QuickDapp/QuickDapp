#!/usr/bin/env bun

import { spawn } from "bun"
import { $ } from "bun"
import { createScriptRunner, type ScriptOptions, type CommandSetup } from "./shared/script-runner"

interface TestOptions extends ScriptOptions {
  pattern?: string
  watch?: boolean
  timeout?: number
  testFile?: string
}

async function testHandler(options: TestOptions) {
  const { pattern = "", watch = false, timeout = 30000, testFile } = options
  
  // Set up test database first
  console.log('📦 Setting up test database...')
  try {
    await $`bun run db:push --force`
    console.log('✅ Test database schema updated successfully')
  } catch (error) {
    console.error('❌ Failed to set up test database:', error)
    process.exit(1)
  }
  console.log('')
    
  // Prepare test command arguments
  const args = ['test']
  
  if (testFile) {
    args.push(testFile)
  } else if (pattern) {
    args.push(pattern)
  }
  
  if (watch) {
    args.push('--watch')
  }
  
  if (timeout) {
    args.push('--timeout', timeout.toString())
  }
  
  if (options.verbose) {
    args.push('--verbose')
  }
  
  console.log('🚀 Running tests...')
  console.log(`   Command: bun ${args.join(' ')}`)
  console.log('')
    
  // Run tests
  const result = await spawn(['bun', ...args], {
    stdio: ['inherit', 'inherit', 'inherit'],
    env: {
      ...process.env,
      NODE_ENV: 'test', // Force test environment
    },
  }).exited
  
  if (result === 0) {
    console.log('')
    console.log('✅ Tests completed successfully!')
  } else {
    console.log('')
    console.log('❌ Tests failed!')
    process.exit(result)
  }
}

// Command setup function for test-specific options
const setupTestCommand: CommandSetup = (program) => {
  return program
    .option('-p, --pattern <pattern>', 'test pattern to match')
    .option('-f, --test-file <file>', 'specific test file to run')
    .option('-w, --watch', 'run tests in watch mode')
    .option('-t, --timeout <ms>', 'test timeout in milliseconds', '30000')
}

// Create script runner
createScriptRunner(
  {
    name: "test",
    description: "Run the test suite",
    env: "test",
  },
  testHandler,
  setupTestCommand
)