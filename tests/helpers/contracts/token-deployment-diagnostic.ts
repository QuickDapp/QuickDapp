#!/usr/bin/env bun

/**
 * Token Deployment Diagnostic Script
 *
 * This script tests token creation on the local anvil chain to diagnose
 * issues with the token deployment process. It:
 * 1. Loads environment configuration from .env and .env.local
 * 2. Connects to the configured chain using the server wallet
 * 3. Deploys a new ERC20 token via the factory contract
 * 4. Reads token metadata to verify deployment success
 */

import { createPublicClient, createWalletClient, http, parseEther } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { createLogger } from "../../../src/server/lib/logger"
import { serverConfig } from "../../../src/shared/config/server"
import {
  getERC20ContractInfo,
  getFactoryContractInfo,
} from "../../../src/shared/contracts"
import { readContract } from "../../../src/shared/contracts/reader"
import {
  createContractWrite,
  writeContract,
} from "../../../src/shared/contracts/writer"

// Create logger for diagnostic output
const logger = createLogger("token-deployment-diagnostic")

interface TokenConfig {
  name: string
  symbol: string
  decimals: number
}

interface DiagnosticResult {
  success: boolean
  deployedTokenAddress?: string
  tokenMetadata?: any
  error?: string
  transactionHash?: string
}

/**
 * Get the configured chain from environment
 */
function getChainConfig() {
  // For anvil/local development, use a basic chain config
  if (serverConfig.CHAIN === "anvil") {
    return {
      id: 31337,
      name: "Anvil",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: {
        default: { http: [serverConfig.CHAIN_RPC_ENDPOINT] },
        public: { http: [serverConfig.CHAIN_RPC_ENDPOINT] },
      },
    }
  }

  throw new Error(`Unsupported chain: ${serverConfig.CHAIN}`)
}

/**
 * Main diagnostic function
 */
async function runTokenDeploymentDiagnostic(): Promise<DiagnosticResult> {
  logger.info("Starting token deployment diagnostic...")

  try {
    // Log configuration
    logger.info("Configuration:")
    logger.info(`  Chain: ${serverConfig.CHAIN}`)
    logger.info(`  RPC Endpoint: ${serverConfig.CHAIN_RPC_ENDPOINT}`)
    logger.info(`  Factory Contract: ${serverConfig.FACTORY_CONTRACT_ADDRESS}`)
    logger.info(
      `  Server Wallet: ${privateKeyToAccount(serverConfig.SERVER_WALLET_PRIVATE_KEY as `0x${string}`).address}`,
    )

    // Create chain config
    const chain = getChainConfig()
    logger.info(`  Chain ID: ${chain.id}`)

    // Create clients
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

    logger.info(`Connected to chain with wallet: ${account.address}`)

    // Check wallet balance
    const balance = await publicClient.getBalance({ address: account.address })
    logger.info(
      `Wallet balance: ${balance} wei (${Number(balance) / 1e18} ETH)`,
    )

    if (balance === 0n) {
      throw new Error("Wallet has no ETH balance for gas fees")
    }

    // Get factory contract info
    const factoryContract = getFactoryContractInfo()
    logger.info(`Using factory contract at: ${factoryContract.address}`)

    // Check if factory contract exists
    const factoryCode = await publicClient.getCode({
      address: factoryContract.address,
    })
    if (!factoryCode || factoryCode === "0x") {
      throw new Error(
        `Factory contract not deployed at ${factoryContract.address}`,
      )
    }
    logger.info("Factory contract code found")

    // Define token configuration
    const tokenConfig: TokenConfig = {
      name: "Diagnostic Test Token",
      symbol: "DTT",
      decimals: 18,
    }
    const initialSupply = parseEther("1000000") // 1M tokens

    logger.info("Token Configuration:")
    logger.info(`  Name: ${tokenConfig.name}`)
    logger.info(`  Symbol: ${tokenConfig.symbol}`)
    logger.info(`  Decimals: ${tokenConfig.decimals}`)
    logger.info(
      `  Initial Supply: ${initialSupply} (${Number(initialSupply) / 1e18} tokens)`,
    )

    // Create the contract write transaction
    const deployTokenTx = createContractWrite(
      factoryContract.address,
      factoryContract.abi,
      "erc20DeployToken",
      [tokenConfig, initialSupply],
    )

    logger.info("Deploying token via factory contract using advanced writer...")

    // Execute the transaction using the advanced writer with robust error handling
    const receipt = await writeContract(
      publicClient,
      walletClient,
      deployTokenTx,
      {
        onTransactionSubmitted: (txHash) => {
          logger.info(`Transaction submitted: ${txHash}`)
        },
        onTransactionConfirmed: (receipt) => {
          logger.info(`Transaction confirmed in block: ${receipt.blockNumber}`)
          logger.info(`Gas used: ${receipt.gasUsed}`)
        },
      },
    )

    // Parse logs to find the deployed token address
    let deployedTokenAddress: string | undefined

    // First, try to decode the return value from the transaction
    // The erc20DeployToken function returns the deployed token address
    try {
      const decodedReturn = await publicClient.getTransactionReceipt({
        hash: receipt.transactionHash,
      })

      logger.info(`Transaction status: ${decodedReturn.status}`)
      logger.info(`Number of logs: ${decodedReturn.logs.length}`)

      // Try to decode logs using the factory contract ABI
      for (let i = 0; i < receipt.logs.length; i++) {
        const log = receipt.logs[i]
        if (!log) continue

        logger.info(`Log ${i}:`)
        logger.info(`  Address: ${log.address}`)
        logger.info(
          `  Topics: ${log.topics?.map((t) => t || "null").join(", ") || "none"}`,
        )
        logger.info(`  Data: ${log.data || "none"}`)

        // Check if this log is from our factory contract
        if (
          log.address?.toLowerCase() === factoryContract.address.toLowerCase()
        ) {
          // The ERC20NewToken event has the token address as the first indexed parameter (second topic)
          if (log.topics && log.topics.length >= 2 && log.topics[1]) {
            const tokenAddressFromTopic = log.topics[1]
            // Convert from bytes32 to address (remove 0x and take last 40 characters, then add 0x back)
            const cleanAddress = `0x${tokenAddressFromTopic.slice(26)}` // Remove 0x and first 24 chars (12 bytes of padding)
            logger.info(`  Extracted token address: ${cleanAddress}`)
            deployedTokenAddress = cleanAddress
            break
          }
        }
      }
    } catch (error) {
      logger.warn(`Error parsing transaction return value: ${error}`)
    }

    if (!deployedTokenAddress) {
      throw new Error(
        "Could not find deployed token address in transaction logs",
      )
    }

    logger.info(`Token deployed successfully at: ${deployedTokenAddress}`)

    // Test reading token metadata using individual contract reads (no multicall)
    logger.info("Reading token metadata using individual contract reads...")

    const erc20Contract = getERC20ContractInfo(deployedTokenAddress)

    // Read each metadata field individually
    logger.info("Reading token name...")
    const tokenName = await readContract<string>(
      {
        address: erc20Contract.address,
        abi: erc20Contract.abi,
        functionName: "name",
      },
      publicClient,
    )

    logger.info("Reading token symbol...")
    const tokenSymbol = await readContract<string>(
      {
        address: erc20Contract.address,
        abi: erc20Contract.abi,
        functionName: "symbol",
      },
      publicClient,
    )

    logger.info("Reading token decimals...")
    const tokenDecimals = await readContract<number>(
      {
        address: erc20Contract.address,
        abi: erc20Contract.abi,
        functionName: "decimals",
      },
      publicClient,
    )

    logger.info("Reading token total supply...")
    const tokenTotalSupply = await readContract<bigint>(
      {
        address: erc20Contract.address,
        abi: erc20Contract.abi,
        functionName: "totalSupply",
      },
      publicClient,
    )

    const tokenMetadata = {
      address: deployedTokenAddress,
      name: tokenName,
      symbol: tokenSymbol,
      decimals: Number(tokenDecimals),
      totalSupply: tokenTotalSupply,
    }

    logger.info("Token Metadata Retrieved:")
    logger.info(`  Address: ${tokenMetadata.address}`)
    logger.info(`  Name: ${tokenMetadata.name}`)
    logger.info(`  Symbol: ${tokenMetadata.symbol}`)
    logger.info(`  Decimals: ${tokenMetadata.decimals}`)
    logger.info(
      `  Total Supply: ${tokenMetadata.totalSupply} (${Number(tokenMetadata.totalSupply) / 1e18} tokens)`,
    )

    // Verify metadata matches what we deployed
    const metadataMatches =
      tokenMetadata.name === tokenConfig.name &&
      tokenMetadata.symbol === tokenConfig.symbol &&
      tokenMetadata.decimals === tokenConfig.decimals &&
      tokenMetadata.totalSupply === initialSupply

    if (!metadataMatches) {
      logger.warn("Token metadata does not match deployment configuration!")
      logger.warn("Expected:")
      logger.warn(`  Name: ${tokenConfig.name}`)
      logger.warn(`  Symbol: ${tokenConfig.symbol}`)
      logger.warn(`  Decimals: ${tokenConfig.decimals}`)
      logger.warn(`  Total Supply: ${initialSupply}`)
    } else {
      logger.info("✅ Token metadata matches deployment configuration")
    }

    return {
      success: true,
      deployedTokenAddress,
      tokenMetadata,
      transactionHash: receipt.transactionHash,
    }
  } catch (error) {
    logger.error(`Diagnostic failed: ${error}`)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Run the diagnostic if this script is executed directly
 */
if (import.meta.main) {
  logger.info("🔧 Token Deployment Diagnostic Tool")
  logger.info("=".repeat(50))

  runTokenDeploymentDiagnostic()
    .then((result) => {
      logger.info("=".repeat(50))
      if (result.success) {
        logger.info("✅ DIAGNOSTIC PASSED")
        logger.info(`Token deployed at: ${result.deployedTokenAddress}`)
        logger.info(`Transaction hash: ${result.transactionHash}`)
        process.exit(0)
      } else {
        logger.error("❌ DIAGNOSTIC FAILED")
        logger.error(`Error: ${result.error}`)
        process.exit(1)
      }
    })
    .catch((error) => {
      logger.error("❌ DIAGNOSTIC CRASHED")
      logger.error(`Unexpected error: ${error}`)
      process.exit(1)
    })
}

export { runTokenDeploymentDiagnostic, type DiagnosticResult }
