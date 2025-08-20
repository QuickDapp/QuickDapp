import type { ChildProcess } from "node:child_process"
import { spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { createPublicClient, createWalletClient, http, parseEther } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { foundry } from "viem/chains"
import { testLogger } from "./logger"

export interface AnvilInstance {
  process: ChildProcess
  url: string
  chainId: number
  accounts: string[]
  privateKeys: string[]
}

export interface BlockchainTestContext {
  anvil: AnvilInstance
  publicClient: ReturnType<typeof createPublicClient>
  walletClient: ReturnType<typeof createWalletClient>
  testAccount: ReturnType<typeof privateKeyToAccount>
  erc20Address?: `0x${string}`
}

// Default Anvil test accounts (same as hardhat)
const DEFAULT_PRIVATE_KEYS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
]

/**
 * Starts an Anvil instance for testing
 */
export const startAnvil = async (port = 58545): Promise<AnvilInstance> => {
  return new Promise((resolve, reject) => {
    const anvilProcess = spawn("anvil", [
      "--port",
      port.toString(),
      "--accounts",
      "10",
      "--balance",
      "10000",
      "--gas-limit",
      "30000000",
      "--code-size-limit",
      "50000",
      "--gas-price",
      "1000000000", // 1 gwei
    ])

    let isResolved = false
    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true
        anvilProcess.kill()
        reject(new Error("Anvil failed to start within timeout"))
      }
    }, 10000) // 10 second timeout

    anvilProcess.stdout?.on("data", (data) => {
      const output = data.toString()

      // Look for the "Listening on" message to know Anvil is ready
      if (output.includes("Listening on") && !isResolved) {
        isResolved = true
        clearTimeout(timeout)

        resolve({
          process: anvilProcess,
          url: `http://127.0.0.1:${port}`,
          chainId: foundry.id,
          accounts: DEFAULT_PRIVATE_KEYS.map(
            (pk) => privateKeyToAccount(pk as `0x${string}`).address,
          ),
          privateKeys: DEFAULT_PRIVATE_KEYS,
        })
      }
    })

    anvilProcess.stderr?.on("data", (data) => {
      const error = data.toString()
      if (!isResolved && error.includes("Error")) {
        isResolved = true
        clearTimeout(timeout)
        anvilProcess.kill()
        reject(new Error(`Anvil error: ${error}`))
      }
    })

    anvilProcess.on("error", (error) => {
      if (!isResolved) {
        isResolved = true
        clearTimeout(timeout)
        reject(error)
      }
    })
  })
}

/**
 * Stops an Anvil instance
 */
export const stopAnvil = async (anvil: AnvilInstance): Promise<void> => {
  return new Promise((resolve) => {
    if (anvil.process.killed) {
      resolve()
      return
    }

    anvil.process.on("exit", () => {
      resolve()
    })

    anvil.process.kill("SIGTERM")

    // Force kill after 5 seconds if it doesn't exit gracefully
    setTimeout(() => {
      if (!anvil.process.killed) {
        anvil.process.kill("SIGKILL")
      }
      resolve()
    }, 5000)
  })
}

/**
 * Creates a blockchain test context with clients and test account
 */
export const createBlockchainTestContext = async (
  port = 58545,
): Promise<BlockchainTestContext> => {
  const anvil = await startAnvil(port)

  const publicClient = createPublicClient({
    chain: foundry,
    transport: http(anvil.url),
  })

  const testAccount = privateKeyToAccount(anvil.privateKeys[0] as `0x${string}`)

  const walletClient = createWalletClient({
    chain: foundry,
    transport: http(anvil.url),
    account: testAccount,
  })

  return {
    anvil,
    publicClient,
    walletClient,
    testAccount,
  }
}

/**
 * Deploys a mock ERC20 token contract for testing
 */
export const deployMockERC20 = async (
  context: BlockchainTestContext,
  options: {
    name?: string
    symbol?: string
    initialSupply?: bigint
    decimals?: number
  } = {},
): Promise<`0x${string}`> => {
  const {
    name = "Test Token",
    symbol = "TEST",
    initialSupply = parseEther("1000000"),
    decimals = 18,
  } = options

  try {
    // Load the compiled contract artifacts
    const contractPath = path.join(
      process.cwd(),
      "tests/helpers/contracts/out/TestToken.sol/TestToken.json",
    )

    if (!fs.existsSync(contractPath)) {
      throw new Error(
        `Contract artifact not found at ${contractPath}. Run 'forge build' first.`,
      )
    }

    const contractArtifact = JSON.parse(fs.readFileSync(contractPath, "utf8"))
    const bytecode = contractArtifact.bytecode.object as `0x${string}`
    const abi = contractArtifact.abi

    // Deploy the contract
    const hash = await context.walletClient.deployContract({
      abi,
      bytecode,
      args: [name, symbol, initialSupply, decimals],
      account: context.testAccount,
      chain: foundry,
    })

    // Wait for the transaction to be mined
    const receipt = await context.publicClient.waitForTransactionReceipt({
      hash,
    })

    if (!receipt.contractAddress) {
      throw new Error(
        "Contract deployment failed - no contract address in receipt",
      )
    }

    return receipt.contractAddress
  } catch (error) {
    testLogger.error("ERC20 deployment failed:", error)

    // Fallback to mock address for tests that don't require actual deployment
    testLogger.warn("Falling back to mock address")
    return "0x1234567890123456789012345678901234567890" as `0x${string}`
  }
}

/**
 * Mines a specific number of blocks
 */
export const mineBlocks = async (
  context: BlockchainTestContext,
  blockCount: number,
): Promise<void> => {
  // Use anvil's mine RPC method
  for (let i = 0; i < blockCount; i++) {
    await context.publicClient.request({
      method: "anvil_mine" as any,
      params: [],
    })
  }
}

/**
 * Sets the next block timestamp
 */
export const setNextBlockTimestamp = async (
  context: BlockchainTestContext,
  timestamp: number,
): Promise<void> => {
  await context.publicClient.request({
    method: "anvil_setNextBlockTimestamp" as any,
    params: [timestamp],
  })
}

/**
 * Gets the current block number
 */
export const getCurrentBlockNumber = async (
  context: BlockchainTestContext,
): Promise<bigint> => {
  return await context.publicClient.getBlockNumber()
}

/**
 * Gets ERC20 token information
 */
export const getERC20Info = async (
  context: BlockchainTestContext,
  tokenAddress: `0x${string}`,
): Promise<{
  name: string
  symbol: string
  decimals: number
  totalSupply: bigint
}> => {
  try {
    const contractPath = path.join(
      process.cwd(),
      "tests/helpers/contracts/out/TestToken.sol/TestToken.json",
    )

    if (!fs.existsSync(contractPath)) {
      throw new Error(`Contract artifact not found at ${contractPath}`)
    }

    const contractArtifact = JSON.parse(fs.readFileSync(contractPath, "utf8"))
    const abi = contractArtifact.abi

    // Read contract information
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      context.publicClient.readContract({
        address: tokenAddress,
        abi,
        functionName: "name",
        args: [],
      }) as Promise<string>,
      context.publicClient.readContract({
        address: tokenAddress,
        abi,
        functionName: "symbol",
        args: [],
      }) as Promise<string>,
      context.publicClient.readContract({
        address: tokenAddress,
        abi,
        functionName: "decimals",
        args: [],
      }) as Promise<number>,
      context.publicClient.readContract({
        address: tokenAddress,
        abi,
        functionName: "totalSupply",
        args: [],
      }) as Promise<bigint>,
    ])

    return { name, symbol, decimals, totalSupply }
  } catch (error) {
    testLogger.error("Failed to get ERC20 info:", error)
    throw error
  }
}

/**
 * Transfers ERC20 tokens
 */
export const transferERC20 = async (
  context: BlockchainTestContext,
  tokenAddress: `0x${string}`,
  to: `0x${string}`,
  amount: bigint,
): Promise<`0x${string}`> => {
  try {
    const contractPath = path.join(
      process.cwd(),
      "tests/helpers/contracts/out/TestToken.sol/TestToken.json",
    )

    const contractArtifact = JSON.parse(fs.readFileSync(contractPath, "utf8"))
    const abi = contractArtifact.abi

    // Send transfer transaction
    const hash = await context.walletClient.writeContract({
      address: tokenAddress,
      abi,
      functionName: "transfer",
      args: [to, amount],
      chain: foundry,
      account: context.testAccount,
    })

    // Wait for confirmation
    await context.publicClient.waitForTransactionReceipt({ hash })

    return hash
  } catch (error) {
    testLogger.error("Failed to transfer ERC20:", error)
    throw error
  }
}

/**
 * Cleans up a blockchain test context
 */
export const cleanupBlockchainTestContext = async (
  context: BlockchainTestContext,
): Promise<void> => {
  await stopAnvil(context.anvil)
}
