import { getDefaultConfig } from "@rainbow-me/rainbowkit"
import { createPublicClient, http } from "viem"
import { hardhat, mainnet, sepolia } from "wagmi/chains"
import type { ClientConfig } from "../../../shared/config/env"

// Define supported chains based on config
const getSupportedChains = (chainName: string) => {
  switch (chainName.toLowerCase()) {
    case "sepolia":
      return [sepolia]
    case "mainnet":
    case "ethereum":
      return [mainnet]
    case "hardhat":
    case "localhost":
      return [hardhat]
    default:
      // Fallback to sepolia for development
      console.warn(`Unknown chain: ${chainName}, falling back to sepolia`)
      return [sepolia]
  }
}

export const createWeb3Config = (clientConfig: ClientConfig) => {
  const supportedChains = getSupportedChains(clientConfig.CHAIN)
  const chains = supportedChains as any // Type assertion to work around RainbowKit type constraints

  return getDefaultConfig({
    appName: clientConfig.APP_NAME,
    projectId: clientConfig.WALLETCONNECT_PROJECT_ID,
    chains,
    transports: {
      [chains[0].id]: http(clientConfig.CHAIN_RPC_ENDPOINT),
    },
    ssr: false,
  })
}

// Create public client for read-only operations
export const createPublicWeb3Client = (clientConfig: ClientConfig) => {
  const chains = getSupportedChains(clientConfig.CHAIN)

  return createPublicClient({
    chain: chains[0],
    transport: http(clientConfig.CHAIN_RPC_ENDPOINT),
  })
}
