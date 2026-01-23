import { describe, expect, it } from "bun:test"
import { existsSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { runBunInstall } from "../../src/index"
import { createTempDir } from "../helpers/temp-dir"

describe("runBunInstall", () => {
  it(
    "installs dependencies and creates node_modules",
    async () => {
      const { path: targetDir, cleanup } = createTempDir("test-bun-install-")

      try {
        writeFileSync(
          join(targetDir, "package.json"),
          JSON.stringify({
            name: "test-pkg",
            dependencies: {
              "is-odd": "^3.0.1",
            },
          }),
        )

        await runBunInstall(targetDir)

        expect(existsSync(join(targetDir, "node_modules"))).toBe(true)
        expect(existsSync(join(targetDir, "node_modules", "is-odd"))).toBe(true)
      } finally {
        cleanup()
      }
    },
    { timeout: 30000 },
  )

  it(
    "throws error for invalid package.json",
    async () => {
      const { path: targetDir, cleanup } = createTempDir(
        "test-bun-install-bad-",
      )

      try {
        writeFileSync(join(targetDir, "package.json"), "{ invalid json }")

        await expect(runBunInstall(targetDir)).rejects.toThrow()
      } finally {
        cleanup()
      }
    },
    { timeout: 30000 },
  )
})
