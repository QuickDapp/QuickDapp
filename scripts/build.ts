#!/usr/bin/env bun

import path from "node:path"
import { $ } from "bun"
import { existsSync, rmSync } from "fs"
import { generateAbis } from "./shared/generate-abis"
import {
  type CommandSetup,
  createScriptRunner,
  type ScriptOptions,
} from "./shared/script-runner"

interface BuildOptions extends ScriptOptions {
  clean?: boolean
}

async function buildHandler(
  options: BuildOptions,
  config: { rootFolder: string; env: string },
) {
  const { clean = true } = options

  console.log("🏗️  Building QuickDapp v3 for production...")
  console.log("")

  // Step 1: Clean previous builds
  if (clean) {
    if (existsSync("dist")) {
      console.log("🧹 Cleaning previous server build...")
      rmSync("dist", { recursive: true, force: true })
    }
    const frontendDistPath = path.join(
      config.rootFolder,
      "src/server/static/client",
    )
    if (existsSync(frontendDistPath)) {
      console.log("🧹 Cleaning previous frontend build...")
      rmSync(frontendDistPath, { recursive: true, force: true })
    }
  }

  // Step 2: Generate ABIs
  console.log("🔧 Generating ABIs...")
  try {
    await generateAbis({ verbose: false })
    console.log("✅ ABIs generated")
  } catch (error) {
    console.warn("⚠️  ABI generation failed, using defaults:", error)
  }

  // Step 3: Lint and type check
  try {
    console.log("🔎 Linting and type checking...")
    await $`bun run lint`
    console.log("✅ Linting and type checking passed")
  } catch (_error) {
    console.warn("⚠️  Linting or type checking failed, continuing build...")
  }

  // Step 4: Build frontend
  console.log("🎨 Building frontend...")
  await $`bun vite build`.cwd(path.join(config.rootFolder, "src/client"))
  console.log("✅ Frontend build created")

  // Step 5: Build server bundle
  console.log("📦 Building server bundle...")
  await $`bun build src/server/index.ts --outdir dist --target bun --minify --sourcemap`
  console.log("✅ Server bundle created")

  // Step 6: Validation
  console.log("🔍 Validating build...")
  if (!existsSync("dist/index.js")) {
    throw new Error("Build failed - server output file not found")
  }

  const frontendIndexPath = path.join(
    config.rootFolder,
    "src/server/static/client/index.html",
  )
  if (!existsSync(frontendIndexPath)) {
    throw new Error("Build failed - frontend index.html not found")
  }

  console.log("")
  console.log("🎉 Build completed successfully!")
  console.log("")
  console.log("📄 Build artifacts:")
  console.log("   dist/index.js                    - Server bundle")
  console.log("   dist/index.js.map                - Source map")
  console.log("   src/server/static/client/        - Frontend assets")
  console.log("")
  console.log("🚀 To run production server:")
  console.log("   cd dist && bun index.js")
  console.log("")
}

// Command setup function for build-specific options
const setupBuildCommand: CommandSetup = (program) => {
  return program
    .option("--clean", "clean dist directory before build (default: true)")
    .option("--no-clean", "skip cleaning dist directory")
}

// Create script runner
export const { runScript: runBuild } = createScriptRunner(
  {
    name: "build",
    description: "Build the application for production",
    env: "production",
  },
  buildHandler,
  setupBuildCommand,
)
