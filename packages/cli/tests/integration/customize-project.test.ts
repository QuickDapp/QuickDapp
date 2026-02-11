import { describe, expect, it } from "bun:test"
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { customizeProject } from "../../src/index"
import { createTempDir } from "../helpers/temp-dir"

describe("customizeProject", () => {
  it("updates APP_NAME in .env", () => {
    const { path: dir, cleanup } = createTempDir("customize-test-")
    try {
      writeFileSync(join(dir, ".env"), "APP_NAME=QuickDapp\n")
      writeFileSync(join(dir, "package.json"), '{"name": "@quickdapp/base"}\n')

      customizeProject("my-app", dir)

      const env = readFileSync(join(dir, ".env"), "utf-8")
      expect(env).toContain("APP_NAME=my-app")
      expect(env).not.toContain("APP_NAME=QuickDapp")
    } finally {
      cleanup()
    }
  })

  it("updates name in package.json", () => {
    const { path: dir, cleanup } = createTempDir("customize-test-")
    try {
      writeFileSync(join(dir, ".env"), "APP_NAME=QuickDapp\n")
      writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "@quickdapp/base", version: "1.0.0" }, null, 2) + "\n")

      customizeProject("my-app", dir)

      const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"))
      expect(pkg.name).toBe("my-app")
    } finally {
      cleanup()
    }
  })

  it("handles project names with hyphens and numbers", () => {
    const { path: dir, cleanup } = createTempDir("customize-test-")
    try {
      writeFileSync(join(dir, ".env"), "APP_NAME=QuickDapp\n")
      writeFileSync(join(dir, "package.json"), '{"name": "@quickdapp/base"}\n')

      customizeProject("my-app-2024", dir)

      const env = readFileSync(join(dir, ".env"), "utf-8")
      expect(env).toContain("APP_NAME=my-app-2024")

      const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"))
      expect(pkg.name).toBe("my-app-2024")
    } finally {
      cleanup()
    }
  })

  it("skips gracefully when .env is missing", () => {
    const { path: dir, cleanup } = createTempDir("customize-test-")
    try {
      writeFileSync(join(dir, "package.json"), '{"name": "@quickdapp/base"}\n')

      expect(() => customizeProject("my-app", dir)).not.toThrow()

      const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"))
      expect(pkg.name).toBe("my-app")
    } finally {
      cleanup()
    }
  })

  it("skips gracefully when package.json is missing", () => {
    const { path: dir, cleanup } = createTempDir("customize-test-")
    try {
      writeFileSync(join(dir, ".env"), "APP_NAME=QuickDapp\n")

      expect(() => customizeProject("my-app", dir)).not.toThrow()

      const env = readFileSync(join(dir, ".env"), "utf-8")
      expect(env).toContain("APP_NAME=my-app")
    } finally {
      cleanup()
    }
  })

  it("preserves all other .env content", () => {
    const { path: dir, cleanup } = createTempDir("customize-test-")
    try {
      const envContent = "NODE_ENV=development\nAPP_NAME=QuickDapp\nDATABASE_URL=postgres://localhost\n"
      writeFileSync(join(dir, ".env"), envContent)
      writeFileSync(join(dir, "package.json"), '{"name": "@quickdapp/base"}\n')

      customizeProject("my-app", dir)

      const env = readFileSync(join(dir, ".env"), "utf-8")
      expect(env).toContain("NODE_ENV=development")
      expect(env).toContain("APP_NAME=my-app")
      expect(env).toContain("DATABASE_URL=postgres://localhost")
    } finally {
      cleanup()
    }
  })

  it("preserves all other package.json fields", () => {
    const { path: dir, cleanup } = createTempDir("customize-test-")
    try {
      const pkgContent = { name: "@quickdapp/base", version: "1.0.0", description: "My app", scripts: { dev: "bun run dev" } }
      writeFileSync(join(dir, ".env"), "APP_NAME=QuickDapp\n")
      writeFileSync(join(dir, "package.json"), JSON.stringify(pkgContent, null, 2) + "\n")

      customizeProject("my-app", dir)

      const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"))
      expect(pkg.name).toBe("my-app")
      expect(pkg.version).toBe("1.0.0")
      expect(pkg.description).toBe("My app")
      expect(pkg.scripts.dev).toBe("bun run dev")
    } finally {
      cleanup()
    }
  })
})
