#!/usr/bin/env bun

import path from "node:path"
import { $ } from "bun"
import { cpSync, existsSync, rmSync } from "fs"
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

  // Define build paths
  const PATHS = {
    ROOT: config.rootFolder,
    DIST: path.join(config.rootFolder, "dist"),
    DIST_SERVER: path.join(config.rootFolder, "dist", "server"),
    DIST_CLIENT: path.join(config.rootFolder, "dist", "client"),
    SRC_CLIENT: path.join(config.rootFolder, "src", "client"),
    SRC_SERVER: path.join(config.rootFolder, "src", "server"),
    SERVER_STATIC: path.join(config.rootFolder, "src", "server", "static"),
    SERVER_STATIC_CLIENT: path.join(
      config.rootFolder,
      "src",
      "server",
      "static",
      "client",
    ),
    SERVER_INDEX: path.join(config.rootFolder, "src", "server", "index.ts"),
    DIST_SERVER_STATIC: path.join(
      config.rootFolder,
      "dist",
      "server",
      "static",
    ),
  }

  console.log("🏗️  Building QuickDapp for production...")
  console.log("")

  // Step 1: Clean previous builds
  if (clean) {
    if (existsSync(PATHS.DIST)) {
      console.log("🧹 Cleaning previous build...")
      rmSync(PATHS.DIST, { recursive: true, force: true })
    }
    if (existsSync(PATHS.SERVER_STATIC_CLIENT)) {
      console.log("🧹 Cleaning previous server static files...")
      rmSync(PATHS.SERVER_STATIC_CLIENT, { recursive: true, force: true })
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
  await $`bun vite build`.cwd(PATHS.SRC_CLIENT)
  console.log("✅ Frontend built to dist/client")

  // Step 5: Copy frontend build to server static directory
  console.log("📁 Copying frontend to server static directory...")
  cpSync(PATHS.DIST_CLIENT, PATHS.SERVER_STATIC_CLIENT, { recursive: true })
  console.log("✅ Frontend copied to server static directory")

  // Step 6: Build server bundle
  console.log("📦 Building server bundle...")
  await $`bun build ${PATHS.SERVER_INDEX} --outdir ${PATHS.DIST_SERVER} --target bun --minify --sourcemap`
  console.log("✅ Server built to dist/server")

  // Step 7: Copy server static directory to dist/server
  console.log("📁 Copying server static directory to dist/server...")
  cpSync(PATHS.SERVER_STATIC, PATHS.DIST_SERVER_STATIC, { recursive: true })
  console.log("✅ Server static directory copied to dist/server")

  // Step 8: Validation
  console.log("🔍 Validating build...")
  const SERVER_INDEX_JS = path.join(PATHS.DIST_SERVER, "index.js")
  if (!existsSync(SERVER_INDEX_JS)) {
    throw new Error("Build failed - server output file not found")
  }

  const CLIENT_INDEX_HTML = path.join(PATHS.DIST_CLIENT, "index.html")
  if (!existsSync(CLIENT_INDEX_HTML)) {
    throw new Error("Build failed - frontend index.html not found")
  }

  const SERVER_STATIC_INDEX_HTML = path.join(
    PATHS.SERVER_STATIC_CLIENT,
    "index.html",
  )
  if (!existsSync(SERVER_STATIC_INDEX_HTML)) {
    throw new Error(
      "Build failed - frontend not copied to server static directory",
    )
  }

  const DIST_SERVER_STATIC_INDEX_HTML = path.join(
    PATHS.DIST_SERVER_STATIC,
    "client",
    "index.html",
  )
  if (!existsSync(DIST_SERVER_STATIC_INDEX_HTML)) {
    throw new Error(
      "Build failed - server static directory not copied to dist/server",
    )
  }

  console.log("")
  console.log("🎉 Build completed successfully!")
  console.log("")
  console.log("📄 Build artifacts:")
  console.log("   dist/server/index.js             - Server bundle")
  console.log("   dist/server/index.js.map         - Server source map")
  console.log("   dist/server/static/              - Server static files")
  console.log("   dist/client/                     - Frontend build")
  console.log(
    "   src/server/static/client/        - Frontend assets (copied for dev server)",
  )
  console.log("")
  console.log("🚀 To run production server:")
  console.log("   cd dist/server && bun index.js")
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
