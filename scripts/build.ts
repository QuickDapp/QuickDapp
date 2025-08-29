#!/usr/bin/env bun

import path from "node:path"
import { zip } from "@hiddentao/zip-json"
import { $ } from "bun"
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "fs"
import { generateAbis } from "./shared/generate-abis"
import {
  type CommandSetup,
  createScriptRunner,
  type ScriptOptions,
} from "./shared/script-runner"

interface BuildOptions extends ScriptOptions {
  clean?: boolean
  binary?: boolean
}

async function buildHandler(
  options: BuildOptions,
  config: {
    rootFolder: string
    env: string
    parsedEnv: Record<string, string>
  },
) {
  const { clean = true, binary = false } = options

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

  // Step 9: Binary build (optional)
  if (binary) {
    console.log("🔧 Building binary distribution...")
    await buildBinaryDistribution(PATHS, config)
    console.log("✅ Binary distribution built")
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
  if (binary) {
    console.log("")
    console.log("📦 Binary distribution:")
    console.log("   dist/server/binary.js            - Binary entry point")
    console.log("   dist/server/binary-assets.json   - Embedded assets")
    console.log("   dist/binaries/                   - Platform binaries")
  }
  console.log("")
  console.log("🚀 To run production server:")
  if (binary) {
    console.log("   ./dist/binaries/quickdapp-<platform>")
    console.log("   or cd dist/server && bun binary.js")
  } else {
    console.log("   cd dist/server && bun index.js")
  }
  console.log("")
}

async function buildBinaryDistribution(
  PATHS: any,
  config: {
    rootFolder: string
    env: string
    parsedEnv: Record<string, string>
  },
) {
  const BINARY_PATHS = {
    BINARY_ASSETS_JSON: path.join(PATHS.DIST_SERVER, "binary-assets.json"),
    BINARY_ENTRY: path.join(PATHS.DIST_SERVER, "binary.js"),
    BINARIES_DIR: path.join(PATHS.DIST, "binaries"),
  }

  // Create binaries directory
  if (!existsSync(BINARY_PATHS.BINARIES_DIR)) {
    mkdirSync(BINARY_PATHS.BINARIES_DIR, { recursive: true })
  }

  // Create patterns for files to include in the binary archive
  const patterns: string[] = []
  const baseDir = PATHS.DIST_SERVER

  // Include static files if they exist
  const staticDir = path.join(PATHS.DIST_SERVER, "static")
  if (existsSync(staticDir)) {
    patterns.push("static/**/*")
  }

  // Create compressed assets file using file patterns
  const compressedAssets = await zip(patterns, {
    baseDir,
    ignore: ["index.js", "index.js.map", "binary.js", "binary-assets.json"],
  })
  writeFileSync(
    BINARY_PATHS.BINARY_ASSETS_JSON,
    JSON.stringify(compressedAssets),
  )

  // Create binary entry point with embedded environment
  const binaryCode = `#!/usr/bin/env bun

import { readFileSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import { mkdtemp } from "fs/promises"
import { unzip } from "@hiddentao/zip-json"

// Embedded environment configuration
const EMBEDDED_ENV = ${JSON.stringify(config.parsedEnv, null, 2)}

// Always apply embedded environment configuration
Object.assign(process.env, EMBEDDED_ENV)

// Check if this is a worker process
if (process.env.WORKER_ID) {
  // Worker process - just import and let index.js handle worker startup
  await import("./index.js")
} else {
  // Main process - extract assets and start server
  const tempDir = await mkdtemp(join(tmpdir(), "quickdapp-binary-"))
  console.log(\`📁 Static assets extracted to: \${tempDir}\`)

  // Load embedded assets and extract to temp directory
  const assetsData = JSON.parse(readFileSync(join(__dirname, "binary-assets.json"), "utf-8"))
  await unzip(assetsData, { outputDir: tempDir, overwrite: true })

  // Set static assets folder to the temp directory
  process.env.STATIC_ASSETS_FOLDER = tempDir

  // Import and run the main server
  const { createApp } = await import("./index.js")
  await createApp()
}
`

  writeFileSync(BINARY_PATHS.BINARY_ENTRY, binaryCode)

  // Compile binaries for each platform
  const platforms = [
    { target: "bun-linux-x64", name: "quickdapp-linux-x64" },
    { target: "bun-linux-arm64", name: "quickdapp-linux-arm64" },
    { target: "bun-windows-x64", name: "quickdapp-windows-x64.exe" },
    { target: "bun-darwin-x64", name: "quickdapp-darwin-x64" },
    { target: "bun-darwin-arm64", name: "quickdapp-darwin-arm64" },
  ]

  for (const platform of platforms) {
    console.log(`  📦 Compiling ${platform.name}...`)
    const outputPath = path.join(BINARY_PATHS.BINARIES_DIR, platform.name)

    try {
      await $`bun build ${BINARY_PATHS.BINARY_ENTRY} --compile --target ${platform.target} --outfile ${outputPath}`.cwd(
        PATHS.DIST_SERVER,
      )
    } catch (error) {
      console.warn(`⚠️  Failed to compile ${platform.name}:`, error)
    }
  }
}

// Command setup function for build-specific options
const setupBuildCommand: CommandSetup = (program) => {
  return program
    .option("--clean", "clean dist directory before build (default: true)")
    .option("--no-clean", "skip cleaning dist directory")
    .option("--binary", "create binary distribution with embedded assets")
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
