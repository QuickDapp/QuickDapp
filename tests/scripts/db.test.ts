import { describe, expect, it } from "bun:test"
import path from "node:path"
import { $ } from "bun"

const ROOT = path.join(import.meta.dir, "../..")

describe("CLI: db command", () => {
  describe("db generate", () => {
    it("should run successfully", async () => {
      const result = await $`bun run db generate`.cwd(ROOT).nothrow()
      expect(result.exitCode).toBe(0)
    }, 60000)

    it("should display progress messages", async () => {
      const result = await $`bun run db generate`.cwd(ROOT).nothrow()
      const output = result.stdout.toString()

      expect(output).toContain("Generating DrizzleORM migrations")
    }, 60000)
  })

  describe("db push", () => {
    it("should run successfully with test database", async () => {
      const result = await $`NODE_ENV=test bun run db push`.cwd(ROOT).nothrow()
      expect(result.exitCode).toBe(0)
    }, 60000)

    it("should support --force flag", async () => {
      const result = await $`NODE_ENV=test bun run db push --force`
        .cwd(ROOT)
        .nothrow()
      expect(result.exitCode).toBe(0)
    }, 60000)
  })

  describe("help output", () => {
    it("should display subcommand help", async () => {
      const result = await $`bun run db -h`.cwd(ROOT).nothrow()
      const output = result.stdout.toString()

      expect(output).toContain("generate")
      expect(output).toContain("migrate")
      expect(output).toContain("push")
    })
  })

  describe("error handling", () => {
    it("should handle unknown subcommand", async () => {
      const result = await $`bun run db unknown`.cwd(ROOT).nothrow()
      expect(result.exitCode).not.toBe(0)
    })
  })
})
