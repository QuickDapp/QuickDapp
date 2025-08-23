import { createPublicClient, createWalletClient, http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { serverConfig } from "../shared/config/server"
import { dbManager } from "./db/connection"
import { getChain } from "./lib/chains"
import { createLogger } from "./lib/logger"
import type { ServerApp } from "./types"
import { createWorkerManager } from "./workers"

/**
 * Creates a ServerApp instance with all necessary dependencies
 * This is shared between the main server process and worker processes
 */
export const createServerApp = async (
  options: {
    includeWorkerManager?: boolean
    workerCountOverride?: number
  } = {},
): Promise<
  Omit<ServerApp, "app" | "workerManager"> & {
    workerManager?: ServerApp["workerManager"]
  }
> => {
  const { includeWorkerManager = false, workerCountOverride } = options

  // Create logger
  const rootLogger = createLogger("server")

  // Connect to database using centralized connection manager
  const db = await dbManager.connect({
    maxConnections: 10, // Default connection pool size
    idleTimeout: 20, // Close idle connections after 20 seconds
    connectTimeout: 10,
    databaseUrl: serverConfig.DATABASE_URL,
  })

  rootLogger.info("Database connected")

  // Create blockchain clients
  const chain = getChain()
  const rpcUrl = serverConfig.CHAIN_RPC_ENDPOINT

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  })

  const walletClient = createWalletClient({
    chain,
    transport: http(rpcUrl),
    account: privateKeyToAccount(
      serverConfig.SERVER_WALLET_PRIVATE_KEY as `0x${string}`,
    ),
  })

  rootLogger.info(`Blockchain clients connected to ${chain.name} (${rpcUrl})`)

  const baseServerApp = {
    db,
    rootLogger,
    createLogger,
    publicClient,
    walletClient,
  }

  if (includeWorkerManager) {
    return {
      ...baseServerApp,
      workerManager: await createWorkerManager(
        baseServerApp as any,
        workerCountOverride,
      ),
    }
  }

  return baseServerApp
}
