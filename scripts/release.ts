#!/usr/bin/env bun

import { $ } from "bun"
import { parseArgs } from "util"

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    "dry-run": { type: "boolean", default: false },
  },
})

const dryRun = values["dry-run"]

async function getVersion(): Promise<string> {
  const pkg = await Bun.file("packages/base/package.json").json()
  return `v${pkg.version}`
}

async function run() {
  console.log("Starting release process...")

  const version = await getVersion()
  console.log(`Version: ${version}`)

  if (dryRun) {
    console.log("[DRY RUN] Would run commit-and-tag-version")
    await $`bunx commit-and-tag-version --dry-run`
    console.log(`[DRY RUN] Would create base-${version}.tar.gz`)
    console.log(`[DRY RUN] Would create variant-web3-${version}.tar.gz`)
    return
  }

  console.log("Running commit-and-tag-version...")
  await $`bunx commit-and-tag-version`

  console.log("Building base package...")
  await $`cd packages/base && bun run build`

  console.log("Building variant-web3 package...")
  await $`cd packages/variant-web3 && bun run build`

  console.log("Creating tar.gz files...")
  await $`cd packages/base && tar -czf ../../base-${version}.tar.gz --exclude='node_modules' --exclude='.git' --exclude='dist' --exclude='bun.lock' .`
  await $`cd packages/variant-web3 && tar -czf ../../variant-web3-${version}.tar.gz --exclude='node_modules' --exclude='.git' --exclude='dist' --exclude='bun.lock' .`

  console.log("Pushing tags...")
  await $`git push --follow-tags origin main`

  console.log("Release complete!")
}

run().catch((err) => {
  console.error("Release failed:", err)
  process.exit(1)
})
