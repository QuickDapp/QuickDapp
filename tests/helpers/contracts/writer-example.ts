#!/usr/bin/env bun

/**
 * Contract Writer Example - V2 Architecture
 *
 * This example demonstrates how to use the new v3 ContractWriter
 * which mirrors the v2 useSetContractValue hook functionality
 * with robust error handling and state management.
 */

import { createPublicClient, createWalletClient, http, parseEther } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { createLogger } from "../../../src/server/lib/logger"
import { serverConfig } from "../../../src/shared/config/server"
import { getFactoryContractInfo } from "../../../src/shared/contracts"
import {
  createContractWrite,
  createContractWriter,
} from "../../../src/shared/contracts/writer"

const logger = createLogger("writer-example")

/**
 * Example showing the ContractWriter class usage
 */
async function demonstrateContractWriter() {
  logger.info("=== Contract Writer v2-style Example ===")

  // Setup clients
  const chain = {
    id: 31337,
    name: "Anvil",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: [serverConfig.CHAIN_RPC_ENDPOINT] },
      public: { http: [serverConfig.CHAIN_RPC_ENDPOINT] },
    },
  }

  const account = privateKeyToAccount(
    serverConfig.SERVER_WALLET_PRIVATE_KEY as `0x${string}`,
  )
  const publicClient = createPublicClient({
    chain,
    transport: http(serverConfig.CHAIN_RPC_ENDPOINT),
  })

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(serverConfig.CHAIN_RPC_ENDPOINT),
  })

  // Create a contract write request
  const factoryContract = getFactoryContractInfo()
  const tokenConfig = {
    name: "Writer Example Token",
    symbol: "WET",
    decimals: 18,
  }
  const initialSupply = parseEther("500000") // 500k tokens

  const deployTokenRequest = createContractWrite(
    factoryContract.address,
    factoryContract.abi,
    "erc20DeployToken",
    [tokenConfig, initialSupply],
  )

  // Create the contract writer - this is reusable and stateful
  const writer = createContractWriter(
    publicClient,
    walletClient,
    deployTokenRequest,
  )

  logger.info(`Can execute: ${writer.canExec}`)
  logger.info(
    `Initial state - Loading: ${writer.isLoading}, Success: ${writer.isSuccess}, Error: ${writer.error}`,
  )

  try {
    // Execute the contract write
    logger.info("Executing contract write...")

    const receipt = await writer.exec({
      onTransactionSubmitted: (txHash) => {
        logger.info(`📤 Transaction submitted: ${txHash}`)
        logger.info(
          `State during submission - Loading: ${writer.isLoading}, Success: ${writer.isSuccess}`,
        )
      },
      onTransactionConfirmed: (receipt) => {
        logger.info(`✅ Transaction confirmed in block: ${receipt.blockNumber}`)
        logger.info(
          `State after confirmation - Loading: ${writer.isLoading}, Success: ${writer.isSuccess}`,
        )
      },
    })

    logger.info(
      `Final state - Loading: ${writer.isLoading}, Success: ${writer.isSuccess}, Error: ${writer.error}`,
    )
    logger.info(`Transaction hash: ${writer.txHash}`)
    logger.info(`Block number: ${writer.receipt?.blockNumber}`)

    return receipt.transactionHash
  } catch (error) {
    logger.error(`Contract write failed: ${error}`)
    logger.error(
      `Error state - Loading: ${writer.isLoading}, Success: ${writer.isSuccess}, Error: ${writer.error?.message}`,
    )

    // Demonstrate reset functionality
    logger.info("Demonstrating reset functionality...")
    writer.reset()
    logger.info(
      `After reset - Loading: ${writer.isLoading}, Success: ${writer.isSuccess}, Error: ${writer.error}`,
    )

    throw error
  }
}

/**
 * Example showing error handling and retry logic
 */
async function demonstrateErrorHandlingAndRetry() {
  logger.info("=== Error Handling and Retry Example ===")

  // This will fail because we're using an invalid contract address
  const invalidRequest = createContractWrite(
    "0x0000000000000000000000000000000000000001", // Invalid address
    [], // Empty ABI (will cause errors)
    "someFunction",
    [],
  )

  const account = privateKeyToAccount(
    serverConfig.SERVER_WALLET_PRIVATE_KEY as `0x${string}`,
  )
  const chain = {
    id: 31337,
    name: "Anvil",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: [serverConfig.CHAIN_RPC_ENDPOINT] },
      public: { http: [serverConfig.CHAIN_RPC_ENDPOINT] },
    },
  }

  const publicClient = createPublicClient({
    chain,
    transport: http(serverConfig.CHAIN_RPC_ENDPOINT),
  })

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(serverConfig.CHAIN_RPC_ENDPOINT),
  })

  const writer = createContractWriter(
    publicClient,
    walletClient,
    invalidRequest,
  )

  try {
    await writer.exec()
  } catch (error) {
    logger.info("✅ Expected error caught successfully")
    logger.info(`Error type: ${(error as Error)?.constructor?.name}`)
    logger.info(`Error message: ${(error as Error)?.message}`)
    logger.info(
      `Writer state - isLoading: ${writer.isLoading}, isSuccess: ${writer.isSuccess}`,
    )
    logger.info(`Error cause: ${(writer.error?.cause as Error)?.message}`)
  }

  // Reset and show the writer can be reused
  writer.reset()
  logger.info(
    `After reset - isLoading: ${writer.isLoading}, isSuccess: ${writer.isSuccess}, error: ${writer.error}`,
  )
}

/**
 * Run examples if executed directly
 */
if (import.meta.main) {
  logger.info("🚀 Contract Writer Examples")

  try {
    const txHash = await demonstrateContractWriter()
    logger.info(`🎉 Successfully deployed token via contract writer: ${txHash}`)
  } catch (error) {
    logger.error(`❌ Contract writer example failed: ${error}`)
  }

  logger.info("")

  await demonstrateErrorHandlingAndRetry()

  logger.info("📝 Examples completed!")
}
