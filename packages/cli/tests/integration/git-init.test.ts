import { describe, expect, it } from "bun:test"
import { execSync } from "node:child_process"
import { existsSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { initGit } from "../../src/index"
import { createTempDir } from "../helpers/temp-dir"

describe("initGit", () => {
  it("initializes a git repository", async () => {
    const { path: targetDir, cleanup } = createTempDir("test-git-init-")

    try {
      writeFileSync(join(targetDir, "README.md"), "# Test Project")
      writeFileSync(
        join(targetDir, "package.json"),
        JSON.stringify({ name: "test" }),
      )

      await initGit(targetDir)

      expect(existsSync(join(targetDir, ".git"))).toBe(true)
    } finally {
      cleanup()
    }
  })

  it("creates initial commit with correct message", async () => {
    const { path: targetDir, cleanup } = createTempDir("test-git-commit-")

    try {
      writeFileSync(join(targetDir, "README.md"), "# Test Project")

      await initGit(targetDir)

      const log = execSync("git log --oneline -1", {
        cwd: targetDir,
        encoding: "utf-8",
      })
      expect(log).toContain("Initial commit from @quickdapp/cli")
    } finally {
      cleanup()
    }
  })

  it("has clean working tree after init", async () => {
    const { path: targetDir, cleanup } = createTempDir("test-git-clean-")

    try {
      writeFileSync(join(targetDir, "README.md"), "# Test Project")

      await initGit(targetDir)

      const status = execSync("git status --porcelain", {
        cwd: targetDir,
        encoding: "utf-8",
      })
      expect(status.trim()).toBe("")
    } finally {
      cleanup()
    }
  })
})
