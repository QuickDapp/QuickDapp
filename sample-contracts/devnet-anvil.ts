#!/usr/bin/env bun

import { $ } from "bun"

console.log("🏗️  Starting local development blockchain (Anvil)...")
console.log("")
console.log("Network Configuration:")
console.log("  Chain ID: 31337")
console.log("  RPC URL: http://localhost:8545")
console.log("  Block time: 1 second")
console.log("  Host: 0.0.0.0 (accepts all connections)")
console.log("")
console.log("💡 To deploy contracts after starting, run:")
console.log("   bun deploy.ts")
console.log("")

// Start Anvil with the configuration
try {
  await $`anvil --chain-id 31337 --block-time 1 --host 127.0.0.1`
} catch (error) {
  console.error("❌ Failed to start Anvil:")
  console.error(error)
  process.exit(1)
}