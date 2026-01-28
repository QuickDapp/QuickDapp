import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { spawnSync } from "node:child_process"
import { existsSync, rmSync } from "node:fs"
import { join } from "node:path"
import { createMockSampleContractsRepo } from "../helpers/mock-git-repo"
import { createTestTarball } from "../helpers/tarball"
import { createTempDir } from "../helpers/temp-dir"
import { createTestServer } from "../helpers/test-server"

const CLI_PATH = join(import.meta.dir, "../../src/index.ts")
const TEST_VERSION = "v1.0.0-test"

function runCli(
  args: string[],
  env?: Record<string, string>,
): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync("bun", ["run", CLI_PATH, ...args], {
    encoding: "utf-8",
    env: { ...process.env, ...env },
  })
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    exitCode: result.status ?? 1,
  }
}

describe("CLI commands", () => {
  describe("help and version", () => {
    it("shows help with --help flag", () => {
      const result = runCli(["--help"])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("CLI to scaffold QuickDapp projects")
      expect(result.stdout).toContain("create")
    })

    it("shows help with create --help", () => {
      const result = runCli(["create", "--help"])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("Create a new QuickDapp project")
      expect(result.stdout).toContain("--variant")
      expect(result.stdout).toContain("--skip-install")
    })

    it("shows version with --version flag", () => {
      const result = runCli(["--version"])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/)
    })
  })

  describe("create command (default)", () => {
    let server: ReturnType<typeof createTestServer>
    let baseTarball: { tarballPath: string; cleanup: () => void }
    let web3Tarball: { tarballPath: string; cleanup: () => void }
    let mockRepo: { repoPath: string; cleanup: () => void }
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

      workDir = createTempDir("test-cli-commands-")
    })

    afterAll(() => {
      server.close()
      baseTarball.cleanup()
      web3Tarball.cleanup()
      mockRepo.cleanup()
      workDir.cleanup()
    })

    const getEnv = () => ({
      QUICKDAPP_GITHUB_API_BASE: server.url,
      QUICKDAPP_GITHUB_DOWNLOAD_BASE: server.url,
      QUICKDAPP_SAMPLE_CONTRACTS_URL: mockRepo.repoPath,
    })

    it("errors when project name is missing", () => {
      const result = runCli(["create"], getEnv())
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain("project-name is required")
    })

    it(
      "uses base variant by default",
      () => {
        const projectName = "test-default-variant"
        const projectDir = join(workDir.path, projectName)

        try {
          const result = spawnSync(
            "bun",
            ["run", CLI_PATH, "create", projectName, "--skip-install"],
            {
              encoding: "utf-8",
              cwd: workDir.path,
              env: { ...process.env, ...getEnv() },
            },
          )

          expect(result.stdout).toContain("Variant: base")
          expect(existsSync(projectDir)).toBe(true)
          expect(existsSync(join(projectDir, "sample-contracts"))).toBe(false)
        } finally {
          rmSync(projectDir, { recursive: true, force: true })
        }
      },
      { timeout: 120000 },
    )

    it(
      "explicit create command works",
      () => {
        const projectName = "test-explicit-create"
        const projectDir = join(workDir.path, projectName)

        try {
          const result = spawnSync(
            "bun",
            ["run", CLI_PATH, "create", projectName, "--skip-install"],
            {
              encoding: "utf-8",
              cwd: workDir.path,
              env: { ...process.env, ...getEnv() },
            },
          )

          expect(result.status).toBe(0)
          expect(result.stdout).toContain("Project created successfully")
        } finally {
          rmSync(projectDir, { recursive: true, force: true })
        }
      },
      { timeout: 120000 },
    )

    it(
      "implicit create command works (default subcommand)",
      () => {
        const projectName = "test-implicit-create"
        const projectDir = join(workDir.path, projectName)

        try {
          const result = spawnSync(
            "bun",
            ["run", CLI_PATH, projectName, "--skip-install"],
            {
              encoding: "utf-8",
              cwd: workDir.path,
              env: { ...process.env, ...getEnv() },
            },
          )

          expect(result.status).toBe(0)
          expect(result.stdout).toContain("Project created successfully")
        } finally {
          rmSync(projectDir, { recursive: true, force: true })
        }
      },
      { timeout: 120000 },
    )

    it(
      "--variant web3 creates web3 project with sample-contracts",
      () => {
        const projectName = "test-web3-variant"
        const projectDir = join(workDir.path, projectName)

        try {
          const result = spawnSync(
            "bun",
            [
              "run",
              CLI_PATH,
              "create",
              projectName,
              "--variant",
              "web3",
              "--skip-install",
            ],
            {
              encoding: "utf-8",
              cwd: workDir.path,
              env: { ...process.env, ...getEnv() },
            },
          )

          expect(result.stdout).toContain("Variant: web3")
          expect(existsSync(join(projectDir, "sample-contracts"))).toBe(true)
        } finally {
          rmSync(projectDir, { recursive: true, force: true })
        }
      },
      { timeout: 120000 },
    )

    it(
      "--variant base creates base project without sample-contracts",
      () => {
        const projectName = "test-base-variant"
        const projectDir = join(workDir.path, projectName)

        try {
          const result = spawnSync(
            "bun",
            [
              "run",
              CLI_PATH,
              "create",
              projectName,
              "--variant",
              "base",
              "--skip-install",
            ],
            {
              encoding: "utf-8",
              cwd: workDir.path,
              env: { ...process.env, ...getEnv() },
            },
          )

          expect(result.stdout).toContain("Variant: base")
          expect(existsSync(join(projectDir, "sample-contracts"))).toBe(false)
        } finally {
          rmSync(projectDir, { recursive: true, force: true })
        }
      },
      { timeout: 120000 },
    )

    it("errors with invalid variant", () => {
      const result = runCli(
        ["create", "test-project", "--variant", "invalid"],
        getEnv(),
      )
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain("Invalid variant")
    })

    it(
      "-v is shorthand for --variant",
      () => {
        const projectName = "test-shorthand-variant"
        const projectDir = join(workDir.path, projectName)

        try {
          const result = spawnSync(
            "bun",
            [
              "run",
              CLI_PATH,
              "create",
              projectName,
              "-v",
              "web3",
              "--skip-install",
            ],
            {
              encoding: "utf-8",
              cwd: workDir.path,
              env: { ...process.env, ...getEnv() },
            },
          )

          expect(result.stdout).toContain("Variant: web3")
        } finally {
          rmSync(projectDir, { recursive: true, force: true })
        }
      },
      { timeout: 120000 },
    )
  })

  describe("--list-versions", () => {
    let server: ReturnType<typeof createTestServer>

    beforeAll(() => {
      server = createTestServer()
      server.addJsonResponse("/repos/QuickDapp/QuickDapp/releases", [
        {
          tag_name: "v3.7.0",
          published_at: "2024-01-15T00:00:00Z",
          prerelease: false,
        },
        {
          tag_name: "v3.6.0",
          published_at: "2024-01-10T00:00:00Z",
          prerelease: false,
        },
      ])
      server.addJsonResponse("/repos/QuickDapp/QuickDapp/releases/latest", {
        tag_name: "v3.7.0",
      })
    })

    afterAll(() => {
      server.close()
    })

    it("lists available versions with create --list-versions", () => {
      const result = runCli(["create", "--list-versions"], {
        QUICKDAPP_GITHUB_API_BASE: server.url,
      })
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("v3.7.0")
      expect(result.stdout).toContain("v3.6.0")
      expect(result.stdout).toContain("(latest)")
    })

    it("lists versions via implicit create --list-versions", () => {
      const result = runCli(["--list-versions"], {
        QUICKDAPP_GITHUB_API_BASE: server.url,
      })
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("Available versions")
    })
  })
})
