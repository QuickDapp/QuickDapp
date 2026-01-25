import multicall3Data from "../abi/data/multicall3.json"
import { ContractName, getContractAbi } from "../abi/generated"
import { clientConfig } from "../config/client"

// Re-export contract utilities
export * from "./multicall"
export * from "./reader"
export * from "./tokens"
export * from "./types"
export * from "./writer"

export { ContractName }

/**
 * Get contract info (address + ABI) for a given contract
 */
export const getContractInfo = (
  contractName: ContractName,
  address: string,
) => {
  const abi = getContractAbi(contractName)

  return {
    address: address as `0x${string}`,
    abi,
  } as const
}

export type ContractInfo = ReturnType<typeof getContractInfo>

/**
 * Get the Factory contract info using the configured address
 */
export const getFactoryContractInfo = () => {
  const address = clientConfig.WEB3_FACTORY_CONTRACT_ADDRESS
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    throw new Error(
      "WEB3_FACTORY_CONTRACT_ADDRESS is not configured. " +
        "Deploy the factory contract first (see sample-contracts/README.md), " +
        "then update WEB3_FACTORY_CONTRACT_ADDRESS in your .env file.",
    )
  }
  return getContractInfo(ContractName.FactoryContract, address)
}

/**
 * Get standard ERC20 contract info for a given address
 */
export const getERC20ContractInfo = (address: string) => {
  return getContractInfo(ContractName.Erc20, address)
}

/**
 * Get Multicall3 deployment information
 */
export const getMulticall3Info = () => {
  return {
    contract: multicall3Data.contract as `0x${string}`,
    sender: multicall3Data.sender as `0x${string}`,
    eth: multicall3Data.eth as string,
    signedDeploymentTx: multicall3Data.signedDeploymentTx as `0x${string}`,
  }
}
