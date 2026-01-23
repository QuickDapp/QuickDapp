import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { downloadAndExtract } from "../../src/index"
import { createTestTarball } from "../helpers/tarball"
import { createTempDir } from "../helpers/temp-dir"
import { createTestServer } from "../helpers/test-server"

const TEST_VERSION = "v1.0.0-test"

describe("downloadAndExtract", () => {
  let server: ReturnType<typeof createTestServer>
  let baseTarball: { tarballPath: string; cleanup: () => void }
  let web3Tarball: { tarballPath: string; cleanup: () => void }

  beforeAll(() => {
    baseTarball = createTestTarball("base", TEST_VERSION)
    web3Tarball = createTestTarball("web3", TEST_VERSION)

    server = createTestServer()

    server.addFile(
      `/QuickDapp/QuickDapp/releases/download/${TEST_VERSION}/base-${TEST_VERSION}.tar.gz`,
      baseTarball.tarballPath,
    )
    server.addFile(
      `/QuickDapp/QuickDapp/releases/download/${TEST_VERSION}/variant-web3-${TEST_VERSION}.tar.gz`,
      web3Tarball.tarballPath,
    )

    process.env.QUICKDAPP_GITHUB_DOWNLOAD_BASE = server.url
  })

  afterAll(() => {
    server.close()
    baseTarball.cleanup()
    web3Tarball.cleanup()
    delete process.env.QUICKDAPP_GITHUB_DOWNLOAD_BASE
  })

  it("downloads and extracts base variant", async () => {
    const { path: targetDir, cleanup } = createTempDir("test-base-extract-")

    try {
      await downloadAndExtract("base", TEST_VERSION, targetDir)

      expect(existsSync(join(targetDir, "package.json"))).toBe(true)
      expect(existsSync(join(targetDir, "src"))).toBe(true)
      expect(existsSync(join(targetDir, "tsconfig.json"))).toBe(true)
      expect(existsSync(join(targetDir, "docker-compose.yaml"))).toBe(true)

      expect(existsSync(join(targetDir, "node_modules"))).toBe(false)
      expect(existsSync(join(targetDir, "dist"))).toBe(false)
      expect(existsSync(join(targetDir, "bun.lock"))).toBe(false)
    } finally {
      cleanup()
    }
  })

  it("downloads and extracts web3 variant", async () => {
    const { path: targetDir, cleanup } = createTempDir("test-web3-extract-")

    try {
      await downloadAndExtract("web3", TEST_VERSION, targetDir)

      expect(existsSync(join(targetDir, "package.json"))).toBe(true)
      expect(existsSync(join(targetDir, "src"))).toBe(true)
      expect(existsSync(join(targetDir, "tsconfig.json"))).toBe(true)
      expect(existsSync(join(targetDir, "docker-compose.yaml"))).toBe(true)

      expect(existsSync(join(targetDir, "node_modules"))).toBe(false)
      expect(existsSync(join(targetDir, "dist"))).toBe(false)
      expect(existsSync(join(targetDir, "bun.lock"))).toBe(false)
    } finally {
      cleanup()
    }
  })

  it("throws error for non-existent version", async () => {
    const { path: targetDir, cleanup } = createTempDir("test-bad-version-")

    try {
      await expect(
        downloadAndExtract("base", "v999.999.999", targetDir),
      ).rejects.toThrow()
    } finally {
      cleanup()
    }
  })
})
