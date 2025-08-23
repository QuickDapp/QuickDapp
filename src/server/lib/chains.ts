import { type Chain, foundry, mainnet, sepolia } from "viem/chains"
import { serverConfig } from "../../shared/config/server"

/**
 * Get the chain ID for the configured chain
 */
export function getChainId(): number {
  switch (serverConfig.CHAIN.toLowerCase()) {
    case "sepolia":
      return sepolia.id
    case "mainnet":
    case "ethereum":
      return mainnet.id
    case "anvil":
    case "hardhat":
    case "localhost":
      return foundry.id
    default:
      throw new Error(`Unsupported chain: ${serverConfig.CHAIN}`)
  }
}

/**
 * Get the viem chain object for the configured chain
 */
export function getChain(): Chain {
  switch (serverConfig.CHAIN.toLowerCase()) {
    case "sepolia":
      return sepolia
    case "mainnet":
    case "ethereum":
      return mainnet
    case "anvil":
    case "hardhat":
    case "localhost":
      return foundry
    default:
      throw new Error(`Unsupported chain: ${serverConfig.CHAIN}`)
  }
}
