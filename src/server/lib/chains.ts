import type { Chain } from "viem"
import { serverConfig } from "../../shared/config/server"
import {
  getChain as getChainByName,
  getChainId as getChainIdByName,
} from "../../shared/contracts/chain"

/**
 * Get the chain ID for the configured chain
 */
export function getChainId(): number {
  return getChainIdByName(serverConfig.CHAIN)
}

/**
 * Get the viem chain object for the configured chain
 */
export function getChain(): Chain {
  return getChainByName(serverConfig.CHAIN)
}
