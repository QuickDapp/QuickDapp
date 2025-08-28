#!/usr/bin/env bun

import { $ } from "bun"

const contractsDir = import.meta.dir

console.log("🏗️  Starting local development blockchain (Hardhat)...")
console.log("")
console.log("Network Configuration:")
console.log("  Chain ID: 31337")
console.log("  RPC URL: http://localhost:8545")
console.log("  Block time: 1 second")
console.log("  Host: 127.0.0.1 (localhost)")
console.log("")
console.log("💡 To deploy contracts after starting, run:")
console.log("   bun sample-contracts/deploy.ts")
console.log("")

// Start Hardhat node with the configuration
try {
  // Change to the contracts directory to run hardhat
  process.chdir(contractsDir)
  await $`bun hardhat node --hostname 127.0.0.1 --port 8545`
} catch (error) {
  console.error("❌ Failed to start Hardhat node:")
  console.error(error)
  process.exit(1)
}