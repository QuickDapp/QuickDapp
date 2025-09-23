import type { Chain } from "viem"
import * as chains from "viem/chains"

/**
 * Get the viem chain object for the given chain name
 */
export function getChain(chainName: string): Chain {
  const normalizedName = chainName.toLowerCase()

  // Check viem chains
  if (chains[normalizedName as keyof typeof chains]) {
    return chains[normalizedName as keyof typeof chains] as Chain
  }

  // Handle common aliases
  switch (normalizedName) {
    case "mainnet":
    case "ethereum":
      return chains.mainnet
    case "anvil":
    case "hardhat":
    case "localhost":
      return chains.foundry
    default:
      // Development fallback
      console.warn(`Unknown chain: ${chainName}, falling back to hardhat`)
      return chains.hardhat
  }
}

/**
 * Get the chain ID for the given chain name
 */
export function getChainId(chainName: string): number {
  return getChain(chainName).id
}

/**
 * Get supported chains as an array (for RainbowKit config)
 */
export function getSupportedChains(chainName: string): Chain[] {
  return [getChain(chainName)]
}
