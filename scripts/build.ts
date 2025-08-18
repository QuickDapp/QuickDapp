#!/usr/bin/env bun

import { $ } from "bun"
import { rmSync, existsSync } from "fs"
import { createScriptRunner, type ScriptOptions, type CommandSetup } from "./shared/script-runner"

interface BuildOptions extends ScriptOptions {
  clean?: boolean
  skipTypecheck?: boolean
}

async function buildHandler(options: BuildOptions, _config: { rootFolder: string; env: string }) {
  const { clean = true, skipTypecheck = false } = options

  console.log('🏗️  Building QuickDapp v3 for production...')
  console.log('')

  // Step 1: Clean previous build
  if (clean && existsSync('dist')) {
    console.log('🧹 Cleaning previous build...')
    rmSync('dist', { recursive: true, force: true })
  }

  // Step 2: Type checking
  if (!skipTypecheck) {
    console.log('🔍 Type checking...')
    await $`tsc --noEmit`
    console.log('✅ Type checking passed')
  }

  // Step 3: Lint (if biome is available)
  try {
    console.log('🔎 Linting code...')
    await $`bun run lint`
    console.log('✅ Linting passed')
  } catch (error) {
    console.warn('⚠️  Linting failed, continuing build...')
  }

  // Step 4: Build server bundle
  console.log('📦 Building server bundle...')
  await $`bun build src/server/index.ts --outdir dist --target bun --minify --sourcemap`
  console.log('✅ Server bundle created')

  // Step 5: Validation
  console.log('🔍 Validating build...')
  if (!existsSync('dist/index.js')) {
    throw new Error('Build failed - output file not found')
  }

  console.log('')
  console.log('🎉 Build completed successfully!')
  console.log('')
  console.log('📄 Build artifacts:')
  console.log('   dist/index.js     - Server bundle')
  console.log('   dist/index.js.map - Source map')
  console.log('')
  console.log('🚀 To run production server:')
  console.log('   cd dist && bun index.js')
  console.log('')
}

// Command setup function for build-specific options
const setupBuildCommand: CommandSetup = (program) => {
  return program
    .option('--clean', 'clean dist directory before build (default: true)')
    .option('--no-clean', 'skip cleaning dist directory')
    .option('--skip-typecheck', 'skip TypeScript type checking')
}

// Create script runner
export const { runScript: runBuild } = createScriptRunner(
  {
    name: "build",
    description: "Build the application for production",
    env: "production",
  },
  buildHandler,
  setupBuildCommand
)