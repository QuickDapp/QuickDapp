import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { cloneSampleContracts } from "../../src/index"
import { createMockSampleContractsRepo } from "../helpers/mock-git-repo"
import { createTempDir } from "../helpers/temp-dir"

describe("cloneSampleContracts", () => {
  let mockRepo: { repoPath: string; cleanup: () => void }

  beforeAll(() => {
    mockRepo = createMockSampleContractsRepo()
    process.env.QUICKDAPP_SAMPLE_CONTRACTS_URL = mockRepo.repoPath
  })

  afterAll(() => {
    mockRepo.cleanup()
    delete process.env.QUICKDAPP_SAMPLE_CONTRACTS_URL
  })

  it(
    "clones sample-contracts to target directory",
    async () => {
      const { path: targetDir, cleanup } = createTempDir("test-clone-")

      try {
        await cloneSampleContracts(targetDir)

        const contractsDir = join(targetDir, "sample-contracts")
        expect(existsSync(contractsDir)).toBe(true)
        expect(existsSync(join(contractsDir, "foundry.toml"))).toBe(true)
        expect(existsSync(join(contractsDir, "src", "Counter.sol"))).toBe(true)
      } finally {
        cleanup()
      }
    },
    { timeout: 60000 },
  )

  it(
    "initializes submodules",
    async () => {
      const { path: targetDir, cleanup } = createTempDir("test-submodules-")

      try {
        await cloneSampleContracts(targetDir)

        const forgeStdDir = join(
          targetDir,
          "sample-contracts",
          "lib",
          "forge-std",
        )
        expect(existsSync(forgeStdDir)).toBe(true)
        expect(existsSync(join(forgeStdDir, "README.md"))).toBe(true)
      } finally {
        cleanup()
      }
    },
    { timeout: 60000 },
  )
})
