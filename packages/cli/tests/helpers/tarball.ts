import { execSync } from "node:child_process"
import { existsSync, rmSync } from "node:fs"
import { join, resolve } from "node:path"
import { createTempDir } from "./temp-dir"

const MONOREPO_ROOT = resolve(import.meta.dir, "../../../../")

export function createTestTarball(
  variant: "base" | "web3",
  version: string,
): { tarballPath: string; cleanup: () => void } {
  const packageName = variant === "base" ? "base" : "variant-web3"
  const sourceDir = join(MONOREPO_ROOT, "packages", packageName)

  if (!existsSync(sourceDir)) {
    throw new Error(`Package directory not found: ${sourceDir}`)
  }

  const { path: tempDir, cleanup: cleanupTempDir } = createTempDir(
    `quickdapp-tarball-${variant}-`,
  )
  const tarballName = `${packageName}-${version}.tar.gz`
  const tarballPath = join(tempDir, tarballName)

  execSync(
    `tar -czf "${tarballPath}" --exclude='node_modules' --exclude='.git' --exclude='dist' --exclude='bun.lock' --exclude='sample-contracts' -C "${sourceDir}" .`,
    { stdio: "pipe" },
  )

  return {
    tarballPath,
    cleanup: () => {
      cleanupTempDir()
    },
  }
}

export function createAllTestTarballs(version: string): {
  baseTarball: string
  web3Tarball: string
  cleanup: () => void
} {
  const base = createTestTarball("base", version)
  const web3 = createTestTarball("web3", version)

  return {
    baseTarball: base.tarballPath,
    web3Tarball: web3.tarballPath,
    cleanup: () => {
      base.cleanup()
      web3.cleanup()
    },
  }
}
