#!/usr/bin/env node
import { execSync, spawn } from "node:child_process"
import { createWriteStream, existsSync, mkdirSync, rmSync } from "node:fs"
import { mkdir, readdir, rename, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"
import { Readable } from "node:stream"
import { finished } from "node:stream/promises"
import { Command } from "commander"

const GITHUB_REPO = "QuickDapp/QuickDapp"
const VARIANTS = {
  base: "@quickdapp/base",
  web3: "@quickdapp/variant-web3",
} as const

type Variant = keyof typeof VARIANTS

interface CreateOptions {
  variant: Variant
  skipInstall: boolean
}

function checkCommand(command: string, displayName: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: "ignore" })
    return true
  } catch {
    console.error(`Error: ${displayName} is not installed.`)
    console.error(`Please install ${displayName} and try again.`)
    return false
  }
}

function checkPrerequisites(): boolean {
  const hasGit = checkCommand("git", "Git")
  const hasBun = checkCommand("bun", "Bun")
  return hasGit && hasBun
}

async function getLatestRelease(): Promise<string> {
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
  )
  if (!response.ok) {
    throw new Error(`Failed to fetch latest release: ${response.statusText}`)
  }
  const data = (await response.json()) as { tag_name: string }
  return data.tag_name
}

async function downloadAndExtract(
  variant: Variant,
  version: string,
  targetDir: string,
): Promise<void> {
  const packageName = variant === "base" ? "base" : "variant-web3"
  const assetName = `${packageName}-${version}.zip`
  const downloadUrl = `https://github.com/${GITHUB_REPO}/releases/download/${version}/${assetName}`

  console.log(`Downloading ${assetName}...`)

  const response = await fetch(downloadUrl)
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`)
  }

  const tempDir = join(tmpdir(), `quickdapp-${Date.now()}`)
  mkdirSync(tempDir, { recursive: true })
  const tempFile = join(tempDir, assetName)

  const fileStream = createWriteStream(tempFile)
  await finished(Readable.fromWeb(response.body as any).pipe(fileStream))

  console.log("Extracting files...")

  mkdirSync(targetDir, { recursive: true })

  // Extract zip to temp location first, then move contents
  const extractDir = join(tempDir, "extracted")
  mkdirSync(extractDir, { recursive: true })
  execSync(`unzip -q "${tempFile}" -d "${extractDir}"`, {
    stdio: "inherit",
  })

  // Find the extracted folder and move its contents to target
  const extractedContents = execSync(`ls "${extractDir}"`, { encoding: "utf-8" })
    .trim()
    .split("\n")
  if (extractedContents.length === 1 && extractedContents[0]) {
    // Single folder extracted, move its contents
    const innerDir = join(extractDir, extractedContents[0])
    execSync(`mv "${innerDir}"/* "${targetDir}"/`, { stdio: "inherit" })
  } else {
    // Multiple items extracted, move all
    execSync(`mv "${extractDir}"/* "${targetDir}"/`, { stdio: "inherit" })
  }

  rmSync(tempDir, { recursive: true, force: true })
}

async function runBunInstall(targetDir: string): Promise<void> {
  console.log("\nInstalling dependencies...")

  return new Promise((resolve, reject) => {
    const child = spawn("bun", ["install"], {
      cwd: targetDir,
      stdio: "inherit",
    })

    child.on("close", (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`bun install failed with code ${code}`))
      }
    })

    child.on("error", reject)
  })
}

async function initGit(targetDir: string): Promise<void> {
  console.log("\nInitializing git repository...")
  execSync("git init", { cwd: targetDir, stdio: "inherit" })
  execSync("git add .", { cwd: targetDir, stdio: "inherit" })
  execSync('git commit -m "Initial commit from create-quickdapp"', {
    cwd: targetDir,
    stdio: "inherit",
  })
}

async function createProject(
  projectName: string,
  options: CreateOptions,
): Promise<void> {
  const targetDir = join(process.cwd(), projectName)

  if (existsSync(targetDir)) {
    console.error(`Error: Directory "${projectName}" already exists.`)
    process.exit(1)
  }

  console.log(`\nCreating QuickDapp project: ${projectName}`)
  console.log(`Variant: ${options.variant}`)

  try {
    const version = await getLatestRelease()
    console.log(`Using version: ${version}`)

    await downloadAndExtract(options.variant, version, targetDir)

    await initGit(targetDir)

    if (!options.skipInstall) {
      await runBunInstall(targetDir)
    }

    console.log("\n✅ Project created successfully!")
    console.log(`\nNext steps:`)
    console.log(`  cd ${projectName}`)
    if (options.skipInstall) {
      console.log(`  bun install`)
    }
    console.log(`  # Edit .env with your configuration`)
    console.log(`  docker compose up -d`)
    console.log(`  bun run db push`)
    console.log(`  bun run dev`)
  } catch (error) {
    console.error(
      "\nError:",
      error instanceof Error ? error.message : String(error),
    )
    if (existsSync(targetDir)) {
      rmSync(targetDir, { recursive: true, force: true })
    }
    process.exit(1)
  }
}

const program = new Command()

program
  .name("create-quickdapp")
  .description("Create a new QuickDapp project")
  .version("3.4.0")

program
  .argument("<project-name>", "Name of the project to create")
  .option(
    "-v, --variant <variant>",
    "Project variant (base or web3)",
    "web3",
  )
  .option("--skip-install", "Skip running bun install", false)
  .action(async (projectName: string, options: { variant: string; skipInstall: boolean }) => {
    if (!checkPrerequisites()) {
      process.exit(1)
    }

    const variant = options.variant as Variant
    if (!["base", "web3"].includes(variant)) {
      console.error(`Error: Invalid variant "${variant}". Use "base" or "web3".`)
      process.exit(1)
    }

    await createProject(projectName, {
      variant,
      skipInstall: options.skipInstall,
    })
  })

program.parse()
