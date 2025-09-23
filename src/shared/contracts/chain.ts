import type { Chain } from "viem"
import * as chains from "viem/chains"

/**
 * Get the viem chain object for the given chain name
 */
export function getChain(chainName: string): Chain {
  const normalizedName = chainName.toLowerCase()

  // Check viem chains (with normalization)
  if (chains[normalizedName as keyof typeof chains]) {
    return chains[normalizedName as keyof typeof chains] as Chain
  }

  // Handle common aliases
  switch (normalizedName) {
    case "mainnet":
    case "ethereum":
      return chains.mainnet
    case "anvil":
      return chains.anvil
    case "hardhat":
      return chains.hardhat
    case "localhost":
      return chains.localhost
    default:
      throw new Error(`Unknown chain: ${chainName}`)
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
