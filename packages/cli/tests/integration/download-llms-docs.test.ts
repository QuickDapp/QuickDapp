import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { downloadLlmsDocs } from "../../src/index"
import { createTempDir } from "../helpers/temp-dir"
import { createTestServer } from "../helpers/test-server"

const MOCK_LLMS_CONTENT = "# QuickDapp Documentation\n\nThis is the full documentation for QuickDapp v1.0.0."

describe("downloadLlmsDocs", () => {
  let server: ReturnType<typeof createTestServer>

  beforeAll(() => {
    server = createTestServer()

    server.addTextResponse("/docs-versions/1.0.0/llms.txt", MOCK_LLMS_CONTENT)

    process.env.QUICKDAPP_DOCS_BASE = server.url
  })

  afterAll(() => {
    server.close()
    delete process.env.QUICKDAPP_DOCS_BASE
  })

  it("downloads llms.txt into .docs directory", async () => {
    const { path: targetDir, cleanup } = createTempDir("test-llms-docs-")

    try {
      await downloadLlmsDocs("v1.0.0", targetDir)

      const llmsPath = join(targetDir, ".docs", "llms.txt")
      expect(existsSync(llmsPath)).toBe(true)

      const content = readFileSync(llmsPath, "utf-8")
      expect(content).toBe(MOCK_LLMS_CONTENT)
    } finally {
      cleanup()
    }
  })

  it("creates .docs directory if it doesn't exist", async () => {
    const { path: targetDir, cleanup } = createTempDir("test-llms-docs-")

    try {
      expect(existsSync(join(targetDir, ".docs"))).toBe(false)

      await downloadLlmsDocs("v1.0.0", targetDir)

      expect(existsSync(join(targetDir, ".docs"))).toBe(true)
    } finally {
      cleanup()
    }
  })

  it("strips v prefix from version when constructing URL", async () => {
    const { path: targetDir, cleanup } = createTempDir("test-llms-docs-")

    try {
      await downloadLlmsDocs("v1.0.0", targetDir)

      const content = readFileSync(join(targetDir, ".docs", "llms.txt"), "utf-8")
      expect(content).toBe(MOCK_LLMS_CONTENT)
    } finally {
      cleanup()
    }
  })

  it("handles version without v prefix", async () => {
    const { path: targetDir, cleanup } = createTempDir("test-llms-docs-")

    try {
      await downloadLlmsDocs("1.0.0", targetDir)

      const content = readFileSync(join(targetDir, ".docs", "llms.txt"), "utf-8")
      expect(content).toBe(MOCK_LLMS_CONTENT)
    } finally {
      cleanup()
    }
  })

  it("continues gracefully on 404", async () => {
    const { path: targetDir, cleanup } = createTempDir("test-llms-docs-")

    try {
      await downloadLlmsDocs("v999.999.999", targetDir)

      expect(existsSync(join(targetDir, ".docs", "llms.txt"))).toBe(false)
    } finally {
      cleanup()
    }
  })

  it("continues gracefully on network error", async () => {
    const originalBase = process.env.QUICKDAPP_DOCS_BASE
    process.env.QUICKDAPP_DOCS_BASE = "http://localhost:1"

    const { path: targetDir, cleanup } = createTempDir("test-llms-docs-")

    try {
      await downloadLlmsDocs("v1.0.0", targetDir)

      expect(existsSync(join(targetDir, ".docs", "llms.txt"))).toBe(false)
    } finally {
      process.env.QUICKDAPP_DOCS_BASE = originalBase
      cleanup()
    }
  })
})
