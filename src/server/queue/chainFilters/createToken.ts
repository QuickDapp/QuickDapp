import { eq } from "drizzle-orm"
import { parseAbiItem } from "viem"
import { clientConfig } from "../../../shared/config/client"
import { serverConfig } from "../../../shared/config/server"
import { NotificationType } from "../../../shared/notifications/types"
import { users } from "../../db/schema"
import type { ChainFilterModule } from "../jobs/types"

// ERC20NewToken event from the factory contract
const ERC20_NEW_TOKEN_EVENT = parseAbiItem(
  "event ERC20NewToken(address indexed token, string name, string symbol, address indexed creator, uint256 initialSupply)",
)

export const createFilter: ChainFilterModule["createFilter"] = (
  chainClient,
  fromBlock,
  log,
) => {
  if (!chainClient) {
    log?.warn("createToken filter: No chain client provided")
    return null
  }

  try {
    const filterConfig: any = {
      event: ERC20_NEW_TOKEN_EVENT,
      fromBlock,
    }

    // In test mode, don't filter by address to allow test factories
    if (serverConfig.NODE_ENV !== "test") {
      filterConfig.address =
        clientConfig.FACTORY_CONTRACT_ADDRESS as `0x${string}`
    }

    return chainClient.createEventFilter(filterConfig)
  } catch (error) {
    log?.error("createToken filter: Failed to create filter:", error)
    return null
  }
}

export const processChanges: ChainFilterModule["processChanges"] = async (
  serverApp,
  log,
  changes,
) => {
  if (!changes || changes.length === 0) {
    return
  }

  log.info(`Processing ${changes.length} ERC20NewToken events`)

  for (const change of changes) {
    try {
      const {
        args: { token: tokenAddress, name, symbol, creator, initialSupply },
        transactionHash,
      } = change

      log.info(
        `Processing token creation: ${symbol} (${name}) at ${tokenAddress}, creator: ${creator}, initialSupply: ${initialSupply}`,
      )

      const creatorAddress = creator

      // Look up user by wallet address
      const [user] = await serverApp.db
        .select()
        .from(users)
        .where(eq(users.wallet, creatorAddress.toLowerCase()))
        .limit(1)

      if (!user) {
        log.warn(`No user found for wallet ${creatorAddress}`)
        continue
      }

      // Token information is already available from the factory event
      const tokenInfo = {
        name,
        symbol,
      }

      log.debug(
        `Using token metadata from factory event for ${tokenAddress}: ${symbol} (${name})`,
      )

      // Create notification for the user using the new serverApp method
      await serverApp.createNotification(user.id, {
        type: NotificationType.TOKEN_CREATED,
        message: `Created new token ${tokenInfo.symbol} (${tokenInfo.name}) at ${tokenAddress}`,
        transactionHash,
        tokenAddress: tokenAddress.toLowerCase(),
        creator: creatorAddress,
        initialSupply: initialSupply.toString(),
        tokenSymbol: tokenInfo.symbol,
        tokenName: tokenInfo.name,
      })

      log.info(
        `Created notification for user ${user.id} for new token creation`,
      )
    } catch (error) {
      log.error("Error processing token creation event:", error)
    }
  }
}
