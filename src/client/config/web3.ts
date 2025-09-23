import { getDefaultConfig } from "@rainbow-me/rainbowkit"
import type { ClientConfig } from "@shared/config/client"
import { getSupportedChains } from "@shared/contracts/chain"
import { createPublicClient, http } from "viem"

// Track if we've already shown the warning to avoid duplicates
let hasShownPlaceholderWarning = false

export const createWeb3Config = (clientConfig: ClientConfig) => {
  const supportedChains = getSupportedChains(clientConfig.CHAIN)
  const chains = supportedChains as any // Type assertion to work around RainbowKit type constraints

  // Handle placeholder WALLETCONNECT_PROJECT_ID
  let projectId = clientConfig.WALLETCONNECT_PROJECT_ID
  if (projectId === "your_walletconnect_project_id") {
    if (!hasShownPlaceholderWarning) {
      console.warn(
        "⚠️  Using placeholder WALLETCONNECT_PROJECT_ID - wallet connection may not work properly",
      )
      hasShownPlaceholderWarning = true
    }
    // Use a dummy ID that won't cause RainbowKit to fail
    projectId = "00000000000000000000000000000000"
  }

  return getDefaultConfig({
    appName: clientConfig.APP_NAME,
    projectId,
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
