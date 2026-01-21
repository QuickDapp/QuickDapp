import { execSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { createTempDir } from "./temp-dir"

export function createMockSampleContractsRepo(): {
  repoPath: string
  cleanup: () => void
} {
  const { path: repoDir, cleanup } = createTempDir("mock-sample-contracts-")

  mkdirSync(join(repoDir, "src"), { recursive: true })
  mkdirSync(join(repoDir, "lib", "forge-std"), { recursive: true })

  writeFileSync(
    join(repoDir, "foundry.toml"),
    `[profile.default]
src = "src"
out = "out"
libs = ["lib"]
`,
  )

  writeFileSync(
    join(repoDir, "src", "Counter.sol"),
    `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract Counter {
    uint256 public number;

    function setNumber(uint256 newNumber) public {
        number = newNumber;
    }

    function increment() public {
        number++;
    }
}
`,
  )

  writeFileSync(join(repoDir, "lib", "forge-std", "README.md"), "# forge-std mock")
  mkdirSync(join(repoDir, "lib", "forge-std", "src"), { recursive: true })
  writeFileSync(
    join(repoDir, "lib", "forge-std", "src", "Test.sol"),
    "// Mock Test.sol",
  )

  execSync("git init", { cwd: repoDir, stdio: "pipe" })
  execSync("git config user.email 'test@test.com'", {
    cwd: repoDir,
    stdio: "pipe",
  })
  execSync("git config user.name 'Test'", { cwd: repoDir, stdio: "pipe" })
  execSync("git add .", { cwd: repoDir, stdio: "pipe" })
  execSync('git commit -m "Initial commit"', { cwd: repoDir, stdio: "pipe" })

  return { repoPath: repoDir, cleanup }
}
