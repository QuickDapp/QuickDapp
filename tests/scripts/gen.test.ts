import { describe, expect, it } from "bun:test"
import path from "node:path"
import { $ } from "bun"

const ROOT = path.join(import.meta.dir, "../..")

describe("CLI: gen command", () => {
  describe("basic execution", () => {
    it("should run successfully", async () => {
      const result = await $`bun run gen`.cwd(ROOT).nothrow()
      expect(result.exitCode).toBe(0)
    }, 60000)

    it("should display progress messages", async () => {
      const result = await $`bun run gen`.cwd(ROOT).nothrow()
      const output = result.stdout.toString()

      expect(output).toContain("Running code generation")
      expect(output).toContain("Generating types")
      expect(output).toContain("Generating database migrations")
      expect(output).toContain("Code generation complete")
    }, 60000)

    it("should support --verbose flag", async () => {
      const result = await $`bun run gen --verbose`.cwd(ROOT).nothrow()
      expect(result.exitCode).toBe(0)
    }, 60000)
  })

  describe("help output", () => {
    it("should display help with -h flag", async () => {
      const result = await $`bun run gen -h`.cwd(ROOT).nothrow()
      const output = result.stdout.toString()

      expect(output).toContain("Generate types")
      expect(output).toContain("--verbose")
    })
  })
})
