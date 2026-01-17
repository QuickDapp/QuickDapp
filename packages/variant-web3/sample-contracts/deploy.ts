#!/usr/bin/env bun

import { $ } from "bun"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { bootstrap } from "../scripts/shared/bootstrap"

const contractsDir = import.meta.dir
const rootDir = resolve(contractsDir, "..")

// Load environment variables using bootstrap
await bootstrap({ verbose: true })

// Get chain from SUPPORTED_CHAINS (first chain is primary)
const supportedChains = process.env.SUPPORTED_CHAINS?.split(",").map((s) =>
  s.trim(),
)
const chain = supportedChains?.[0] || "sepolia"

// Get RPC URL from SERVER_<CHAIN>_CHAIN_RPC pattern
const chainEnvKey = `SERVER_${chain.toUpperCase()}_CHAIN_RPC`
const rpcUrl = process.env[chainEnvKey]
const privateKey = process.env.SERVER_WALLET_PRIVATE_KEY

if (!rpcUrl) {
  console.error(`❌ ${chainEnvKey} not set in .env file`)
  process.exit(1)
}

if (!privateKey) {
  console.error("❌ SERVER_WALLET_PRIVATE_KEY not set in .env file")
  process.exit(1)
}

console.log("🏗️  Building and deploying sample contracts...")

// Check if foundry is installed
try {
  await $`forge --version`
} catch (error) {
  console.error("❌ Foundry not found. Please install it first:")
  console.error("   curl -L https://foundry.paradigm.xyz | bash")
  console.error("   foundryup")
  process.exit(1)
}

// Build contracts
console.log("📦 Building contracts...")
try {
  process.chdir(contractsDir)
  await $`forge build`
  console.log("✅ Contracts built successfully")
} catch (error) {
  console.error("❌ Failed to build contracts:", error)
  process.exit(1)
}

console.log(`🚀 Deploying to ${chain} (${rpcUrl})...`)

// Deploy contracts
try {
  const deployResult =
    await $`forge create src/ERC20Factory.sol:ERC20Factory --rpc-url ${rpcUrl} --private-key ${privateKey} --chain ${chain} --broadcast`

  // Extract deployed address from forge output
  const output = deployResult.stdout.toString()
  const addressMatch = output.match(/Deployed to: (0x[a-fA-F0-9]{40})/)

  if (!addressMatch) {
    console.error("❌ Could not extract deployed address from forge output")
    console.error("Forge output:", output)
    process.exit(1)
  }

  const deployedAddress = addressMatch[1]
  console.log(`✅ ERC20Factory deployed to: ${deployedAddress}`)

  // Write to .env.local
  const envLocalPath = resolve(rootDir, ".env.local")
  const envLocalContent = existsSync(envLocalPath)
    ? readFileSync(envLocalPath, "utf8")
    : ""

  // Remove any existing FACTORY_CONTRACT_ADDRESS line
  const lines = envLocalContent
    .split("\n")
    .filter((line) => !line.trim().startsWith("FACTORY_CONTRACT_ADDRESS="))

  // Add new address
  lines.push(`FACTORY_CONTRACT_ADDRESS=${deployedAddress}`)

  // Write back to .env.local
  writeFileSync(
    envLocalPath,
    lines.filter((line) => line.trim()).join("\n") + "\n",
  )

  console.log("✅ Updated .env.local with FACTORY_CONTRACT_ADDRESS")
  console.log("")
  console.log("🎉 Sample contracts deployed successfully!")
  console.log("")
  console.log("Next steps:")
  console.log("- Run 'bun run dev' to start the development server")
  console.log(
    "- The frontend will now be able to interact with your deployed Factory contract",
  )
} catch (error) {
  console.error("❌ Failed to deploy contracts:", error)
  process.exit(1)
}
