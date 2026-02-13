import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { createProject } from "../../src/index"
import { createMockSampleContractsRepo } from "../helpers/mock-git-repo"
import { createTestTarball } from "../helpers/tarball"
import { createTempDir } from "../helpers/temp-dir"
import { createTestServer } from "../helpers/test-server"

const TEST_VERSION = "v1.0.0-test"

describe("createProject", () => {
  let server: ReturnType<typeof createTestServer>
  let baseTarball: { tarballPath: string; cleanup: () => void }
  let web3Tarball: { tarballPath: string; cleanup: () => void }
  let mockRepo: { repoPath: string; cleanup: () => void }
  let originalCwd: string
  let workDir: { path: string; cleanup: () => void }

  beforeAll(() => {
    baseTarball = createTestTarball("base", TEST_VERSION)
    web3Tarball = createTestTarball("web3", TEST_VERSION)
    mockRepo = createMockSampleContractsRepo()

    server = createTestServer()

    server.addJsonResponse("/repos/QuickDapp/QuickDapp/releases/latest", {
      tag_name: TEST_VERSION,
    })
    server.addFile(
      `/QuickDapp/QuickDapp/releases/download/${TEST_VERSION}/base-${TEST_VERSION}.tar.gz`,
      baseTarball.tarballPath,
    )
    server.addFile(
      `/QuickDapp/QuickDapp/releases/download/${TEST_VERSION}/variant-web3-${TEST_VERSION}.tar.gz`,
      web3Tarball.tarballPath,
    )

    server.addTextResponse(
      `/docs-versions/${TEST_VERSION.replace(/^v/, "")}/llms.txt`,
      "# QuickDapp Documentation\n\nTest documentation content.",
    )

    process.env.QUICKDAPP_GITHUB_API_BASE = server.url
    process.env.QUICKDAPP_GITHUB_DOWNLOAD_BASE = server.url
    process.env.QUICKDAPP_DOCS_BASE = server.url
    process.env.QUICKDAPP_SAMPLE_CONTRACTS_URL = mockRepo.repoPath

    originalCwd = process.cwd()
    workDir = createTempDir("test-create-project-")
    process.chdir(workDir.path)
  })

  afterAll(() => {
    process.chdir(originalCwd)
    server.close()
    baseTarball.cleanup()
    web3Tarball.cleanup()
    mockRepo.cleanup()
    workDir.cleanup()
    delete process.env.QUICKDAPP_GITHUB_API_BASE
    delete process.env.QUICKDAPP_GITHUB_DOWNLOAD_BASE
    delete process.env.QUICKDAPP_DOCS_BASE
    delete process.env.QUICKDAPP_SAMPLE_CONTRACTS_URL
  })

  it(
    "creates base project with skipInstall",
    async () => {
      const projectName = "test-base-project"
      const projectDir = join(workDir.path, projectName)

      try {
        await createProject(projectName, { variant: "base", skipInstall: true })

        expect(existsSync(projectDir)).toBe(true)
        expect(existsSync(join(projectDir, "package.json"))).toBe(true)
        expect(existsSync(join(projectDir, ".git"))).toBe(true)
        expect(existsSync(join(projectDir, ".docs", "llms.txt"))).toBe(true)
        expect(existsSync(join(projectDir, "node_modules"))).toBe(false)
        expect(existsSync(join(projectDir, "sample-contracts"))).toBe(false)
      } finally {
        rmSync(projectDir, { recursive: true, force: true })
      }
    },
    { timeout: 120000 },
  )

  it(
    "creates web3 project with skipInstall",
    async () => {
      const projectName = "test-web3-project"
      const projectDir = join(workDir.path, projectName)

      try {
        await createProject(projectName, { variant: "web3", skipInstall: true })

        expect(existsSync(projectDir)).toBe(true)
        expect(existsSync(join(projectDir, "package.json"))).toBe(true)
        expect(existsSync(join(projectDir, ".git"))).toBe(true)
        expect(existsSync(join(projectDir, ".docs", "llms.txt"))).toBe(true)
        expect(existsSync(join(projectDir, "sample-contracts"))).toBe(true)
        expect(existsSync(join(projectDir, "node_modules"))).toBe(false)
      } finally {
        rmSync(projectDir, { recursive: true, force: true })
      }
    },
    { timeout: 120000 },
  )

  it("exits when directory already exists", async () => {
    const projectName = "existing-project"
    const projectDir = join(workDir.path, projectName)

    mkdirSync(projectDir)

    const originalExit = process.exit
    let exitCode: number | undefined

    process.exit = ((code?: number) => {
      exitCode = code
      throw new Error("process.exit called")
    }) as typeof process.exit

    try {
      await expect(
        createProject(projectName, { variant: "base", skipInstall: true }),
      ).rejects.toThrow("process.exit called")
      expect(exitCode).toBe(1)
    } finally {
      process.exit = originalExit
      rmSync(projectDir, { recursive: true, force: true })
    }
  })

  it(
    "customizes APP_NAME and package.json name for base variant",
    async () => {
      const projectName = "my-awesome-app"
      const projectDir = join(workDir.path, projectName)

      try {
        await createProject(projectName, { variant: "base", skipInstall: true })

        const envContent = readFileSync(join(projectDir, ".env"), "utf-8")
        expect(envContent).toContain("APP_NAME=my-awesome-app")
        expect(envContent).not.toContain("APP_NAME=QuickDapp")

        const pkgJson = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf-8"))
        expect(pkgJson.name).toBe("my-awesome-app")
        expect(pkgJson.name).not.toBe("@quickdapp/base")
      } finally {
        rmSync(projectDir, { recursive: true, force: true })
      }
    },
    { timeout: 120000 },
  )

  it(
    "customizes APP_NAME and package.json name for web3 variant",
    async () => {
      const projectName = "my-web3-dapp"
      const projectDir = join(workDir.path, projectName)

      try {
        await createProject(projectName, { variant: "web3", skipInstall: true })

        const envContent = readFileSync(join(projectDir, ".env"), "utf-8")
        expect(envContent).toContain("APP_NAME=my-web3-dapp")
        expect(envContent).not.toContain("APP_NAME=QuickDapp")

        const pkgJson = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf-8"))
        expect(pkgJson.name).toBe("my-web3-dapp")
        expect(pkgJson.name).not.toBe("@quickdapp/variant-web3")
      } finally {
        rmSync(projectDir, { recursive: true, force: true })
      }
    },
    { timeout: 120000 },
  )

  it(
    "creates project with dependencies installed",
    async () => {
      const projectName = "test-with-deps"
      const projectDir = join(workDir.path, projectName)

      try {
        await createProject(projectName, {
          variant: "base",
          skipInstall: false,
        })

        expect(existsSync(join(projectDir, "node_modules"))).toBe(true)
      } finally {
        rmSync(projectDir, { recursive: true, force: true })
      }
    },
    { timeout: 120000 },
  )
})
