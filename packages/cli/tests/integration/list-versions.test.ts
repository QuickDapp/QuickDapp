import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { downloadAndExtract, listReleases, type Release } from "../../src/index"
import { createTestTarball } from "../helpers/tarball"
import { createTempDir } from "../helpers/temp-dir"
import { createTestServer } from "../helpers/test-server"

const TEST_RELEASES: Release[] = [
  { tag_name: "v3.5.1", published_at: "2024-01-15T00:00:00Z", prerelease: false },
  { tag_name: "v3.5.0", published_at: "2024-01-10T00:00:00Z", prerelease: false },
  { tag_name: "v3.4.0-beta.1", published_at: "2024-01-05T00:00:00Z", prerelease: true },
]

describe("listReleases", () => {
  let server: ReturnType<typeof createTestServer>

  beforeAll(() => {
    server = createTestServer()
    server.addJsonResponse("/repos/QuickDapp/QuickDapp/releases", TEST_RELEASES)
    process.env.QUICKDAPP_GITHUB_API_BASE = server.url
  })

  afterAll(() => {
    server.close()
    delete process.env.QUICKDAPP_GITHUB_API_BASE
  })

  it("fetches and returns releases", async () => {
    const releases = await listReleases()

    expect(releases).toHaveLength(3)
    expect(releases[0].tag_name).toBe("v3.5.1")
    expect(releases[1].tag_name).toBe("v3.5.0")
    expect(releases[2].tag_name).toBe("v3.4.0-beta.1")
    expect(releases[2].prerelease).toBe(true)
  })
})

describe("--release option", () => {
  let server: ReturnType<typeof createTestServer>
  let tarball: { tarballPath: string; cleanup: () => void }
  const SPECIFIC_VERSION = "v3.5.0"

  beforeAll(() => {
    tarball = createTestTarball("base", SPECIFIC_VERSION)

    server = createTestServer()
    server.addFile(
      `/QuickDapp/QuickDapp/releases/download/${SPECIFIC_VERSION}/base-${SPECIFIC_VERSION}.tar.gz`,
      tarball.tarballPath,
    )

    process.env.QUICKDAPP_GITHUB_DOWNLOAD_BASE = server.url
  })

  afterAll(() => {
    server.close()
    tarball.cleanup()
    delete process.env.QUICKDAPP_GITHUB_DOWNLOAD_BASE
  })

  it("downloads specific version when --release is used", async () => {
    const { path: targetDir, cleanup } = createTempDir("test-specific-version-")

    try {
      await downloadAndExtract("base", SPECIFIC_VERSION, targetDir)

      expect(existsSync(join(targetDir, "package.json"))).toBe(true)
      expect(existsSync(join(targetDir, "src"))).toBe(true)
    } finally {
      cleanup()
    }
  })

  it("throws error for non-existent version", async () => {
    const { path: targetDir, cleanup } = createTempDir("test-invalid-version-")

    try {
      await expect(
        downloadAndExtract("base", "v999.999.999", targetDir),
      ).rejects.toThrow()
    } finally {
      cleanup()
    }
  })
})
