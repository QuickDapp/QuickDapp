import type { Chain } from "viem"
import * as chains from "viem/chains"

/**
 * Get the viem chain object for the given chain name
 */
export function getChain(chainName: string): Chain {
  // Check viem chains
  if (chains[chainName as keyof typeof chains]) {
    return chains[chainName as keyof typeof chains] as Chain
  }

  // Handle common aliases
  switch (chainName) {
    case "ethereum":
      return chains.mainnet
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
