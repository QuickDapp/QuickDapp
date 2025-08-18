#!/usr/bin/env bun

import { spawn } from "bun"
import { execa } from "execa"
import { bootstrap, showScriptHelp } from "./shared/bootstrap"

/**
 * Test runner script for QuickDapp v3
 * 
 * This script:
 * 1. Loads environment configuration (base .env + .env.test overrides)
 * 2. Sets up test database if needed
 * 3. Runs test suites with proper configuration
 * 4. Handles cleanup
 */

export interface TestOptions {
  pattern?: string
  watch?: boolean
  timeout?: number
  verbose?: boolean
  help?: boolean
}

export async function runTests(options: TestOptions = {}) {
  const { pattern = "", watch = false, timeout = 30000, verbose = false } = options
    
  // Prepare test command arguments
  const args = ['test']
  
  if (pattern) {
    args.push(pattern)
  }
  
  if (watch) {
    args.push('--watch')
  }
  
  if (timeout) {
    args.push('--timeout', timeout.toString())
  }
  
  if (verbose) {
    args.push('--verbose')
  }
  
  try {
    console.log('🚀 Running tests...')
    console.log(`   Command: bun ${args.join(' ')}`)
    console.log('')
    
    // Run tests
    const result = await spawn(['bun', ...args], {
      stdio: ['inherit', 'inherit', 'inherit'],
      env: {
        ...process.env,
        NODE_ENV: 'test', // Ensure test environment
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
    
  } catch (error) {
    console.error('💥 Error running tests:', error)
    process.exit(1)
  }
}

async function setupTestDatabase(options: TestOptions = {}) {
  console.log('📦 Setting up test database...')
  
  try {
    // Run drizzle db:push with current environment variables
    // This ensures it uses the test DATABASE_URL from our loaded environment
    console.log('   Running database schema push to test database...')

    const args = ['--force']

    const result = await execa('bun', [
      'run', 
      'db:push', 
      ...args,
    ], {
      env: {
        ...process.env, // Pass all current environment variables including the test DATABASE_URL
      },
      stdio: 'inherit', // Capture output for better error handling
    })

    if (result.exitCode === 0) {
      console.log('✅ Test database schema updated successfully')
    } else {
      console.error('❌ Database schema push failed with exit code:', result.exitCode)
      if (result.stderr) {
        console.error('   stderr:', result.stderr)
      }
      if (result.stdout) {
        console.error('   stdout:', result.stdout)
      }
      throw new Error(`Database setup failed with exit code ${result.exitCode}`)
    }
    
  } catch (error) {
    console.error('💥 Test database setup failed:', error)
    
    if (error instanceof Error && 'exitCode' in error) {
      // This is an execa error with exit code
      throw new Error(`Database setup failed: ${error.message}`)
    } else if (error instanceof Error) {
      // This is a general error
      throw new Error(`Database setup failed: ${error.message}`)
    } else {
      // Unknown error type
      throw new Error(`Database setup failed: ${String(error)}`)
    }
  }
  
  console.log('')
}

// Parse command line arguments
function parseArgs(): TestOptions {
  const args = process.argv.slice(2)
  const options: TestOptions = {}
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    if (arg === '--watch' || arg === '-w') {
      options.watch = true
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true
    } else if (arg === '--help' || arg === '-h') {
      options.help = true
    } else if (arg === '--timeout' || arg === '-t') {
      const nextArg = args[++i]
      if (nextArg !== undefined) {
        options.timeout = parseInt(nextArg, 10)
      }
    } else if (arg && !arg.startsWith('--')) {
      options.pattern = arg
    }
  }
  
  return options
}

// Run if called directly
if (import.meta.main) {
  const options = parseArgs()
  
  if (options.help) {
    showScriptHelp(
      'QuickDapp Test Runner',
      'Runs the test suite with proper environment configuration',
      `bun run scripts/test.ts [options] [pattern]

Options:
  -w, --watch     Run tests in watch mode
  -v, --verbose   Verbose test output and bootstrap info
  -t, --timeout   Test timeout in milliseconds (default: 30000)
  -h, --help      Show this help message

Examples:
  bun run scripts/test.ts                    # Run all tests
  bun run scripts/test.ts --watch           # Run tests in watch mode
  bun run scripts/test.ts server            # Run tests matching 'server'
  bun run scripts/test.ts --verbose         # Run with verbose output
  bun run scripts/test.ts --timeout 60000   # Set 60s timeout`
    )
    process.exit(0)
  }
  
  // Bootstrap with test environment
  await bootstrap({ env: 'test', verbose: !!options.verbose })
  await setupTestDatabase(options)
  await runTests(options)
}