#!/usr/bin/env node
import { execSync, spawn, spawnSync } from "node:child_process"
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { Readable } from "node:stream"
import { finished } from "node:stream/promises"
import { fileURLToPath } from "node:url"
import { Command } from "commander"
import { extract } from "tar"

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf-8"))
const CLI_VERSION = pkg.version

const GITHUB_REPO = "QuickDapp/QuickDapp"
const VARIANTS = {
  base: "@quickdapp/base",
  web3: "@quickdapp/variant-web3",
} as const

function getGithubApiBase(): string {
  return process.env.QUICKDAPP_GITHUB_API_BASE ?? "https://api.github.com"
}

function getGithubDownloadBase(): string {
  return process.env.QUICKDAPP_GITHUB_DOWNLOAD_BASE ?? "https://github.com"
}

function getSampleContractsUrl(): string {
  return process.env.QUICKDAPP_SAMPLE_CONTRACTS_URL ?? "https://github.com/QuickDapp/sample-contracts.git"
}

type Variant = keyof typeof VARIANTS

interface CreateOptions {
  variant: Variant
  skipInstall: boolean
  release?: string
}

interface Release {
  tag_name: string
  published_at: string
  prerelease: boolean
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
    `${getGithubApiBase()}/repos/${GITHUB_REPO}/releases/latest`,
  )
  if (!response.ok) {
    throw new Error(`Failed to fetch latest release: ${response.statusText}`)
  }
  const data = (await response.json()) as { tag_name: string }
  return data.tag_name
}

async function listReleases(): Promise<Release[]> {
  const response = await fetch(
    `${getGithubApiBase()}/repos/${GITHUB_REPO}/releases`,
  )
  if (!response.ok) {
    throw new Error(`Failed to fetch releases: ${response.statusText}`)
  }
  return (await response.json()) as Release[]
}

async function downloadAndExtract(
  variant: Variant,
  version: string,
  targetDir: string,
): Promise<void> {
  const packageName = variant === "base" ? "base" : "variant-web3"
  const assetName = `${packageName}-${version}.tar.gz`
  const downloadUrl = `${getGithubDownloadBase()}/${GITHUB_REPO}/releases/download/${version}/${assetName}`

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

  await extract({
    file: tempFile,
    cwd: targetDir,
  })

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

async function cloneSampleContracts(targetDir: string): Promise<void> {
  console.log("\nCloning sample-contracts...")
  const cloneResult = spawnSync("git", ["clone", getSampleContractsUrl(), "sample-contracts"], {
    cwd: targetDir,
    stdio: "inherit",
  })
  if (cloneResult.status !== 0) {
    throw new Error(`git clone failed with code ${cloneResult.status}`)
  }
  const submoduleResult = spawnSync("git", ["submodule", "update", "--init", "--recursive"], {
    cwd: join(targetDir, "sample-contracts"),
    stdio: "inherit",
  })
  if (submoduleResult.status !== 0) {
    throw new Error(`git submodule update failed with code ${submoduleResult.status}`)
  }
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
    const version = options.release ?? await getLatestRelease()
    console.log(`Using version: ${version}`)

    await downloadAndExtract(options.variant, version, targetDir)

    if (options.variant === "web3") {
      await cloneSampleContracts(targetDir)
    }

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
  .version(CLI_VERSION)

program
  .argument("[project-name]", "Name of the project to create")
  .option(
    "-v, --variant <variant>",
    "Project variant (base or web3)",
    "web3",
  )
  .option("--skip-install", "Skip running bun install", false)
  .option("-r, --release <version>", "Use a specific release version")
  .option("--list-versions", "List available QuickDapp versions")
  .action(async (projectName: string | undefined, options: { variant: string; skipInstall: boolean; release?: string; listVersions?: boolean }) => {
    if (options.listVersions) {
      try {
        const releases = await listReleases()
        const latest = await getLatestRelease()
        console.log("Available versions:")
        for (const release of releases) {
          const isLatest = release.tag_name === latest
          const prerelease = release.prerelease ? " (prerelease)" : ""
          const latestLabel = isLatest ? " (latest)" : ""
          console.log(`  ${release.tag_name}${latestLabel}${prerelease}`)
        }
      } catch (error) {
        console.error(
          "Error:",
          error instanceof Error ? error.message : String(error),
        )
        process.exit(1)
      }
      return
    }

    if (!projectName) {
      console.error("Error: project-name is required")
      console.error("Usage: create-quickdapp <project-name>")
      process.exit(1)
    }

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
      release: options.release,
    })
  })

export {
  checkPrerequisites,
  getLatestRelease,
  listReleases,
  downloadAndExtract,
  runBunInstall,
  cloneSampleContracts,
  initGit,
  createProject,
  type Variant,
  type CreateOptions,
  type Release,
}

const isDirectRun = import.meta.url === `file://${process.argv[1]}`
  || process.argv[1]?.endsWith("/create-quickdapp")
  || process.argv[1]?.endsWith("\\create-quickdapp")

if (isDirectRun) {
  program.parse()
}
