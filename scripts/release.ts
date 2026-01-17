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

async function run() {
  console.log("Starting release process...")

  if (dryRun) {
    console.log("[DRY RUN] Would run commit-and-tag-version")
    await $`bunx commit-and-tag-version --dry-run`
    return
  }

  console.log("Running commit-and-tag-version...")
  await $`bunx commit-and-tag-version`

  console.log("Building base package...")
  await $`cd packages/base && bun run build`

  console.log("Building variant-web3 package...")
  await $`cd packages/variant-web3 && bun run build`

  console.log("Creating zip files...")
  await $`cd packages/base && zip -r ../../base.zip dist/ package.json tsconfig.json biome.json docker-compose.yaml docker-compose.test.yaml scripts/ src/ tests/ static/ .husky/ .dockerignore .gitignore drizzle.config.ts index.ts Dockerfile commitlint.config.js`
  await $`cd packages/variant-web3 && zip -r ../../variant-web3.zip dist/ package.json tsconfig.json biome.json docker-compose.yaml docker-compose.test.yaml scripts/ src/ tests/ static/ sample-contracts/ .husky/ .dockerignore .gitignore drizzle.config.ts foundry.toml index.ts Dockerfile commitlint.config.js`

  console.log("Pushing tags...")
  await $`git push --follow-tags origin main`

  console.log("Release complete!")
}

run().catch((err) => {
  console.error("Release failed:", err)
  process.exit(1)
})
