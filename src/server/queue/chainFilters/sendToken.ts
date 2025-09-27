import { eq } from "drizzle-orm"
import { parseAbiItem } from "viem"
import { NotificationType } from "../../../shared/notifications/types"
import { users } from "../../db/schema"
import type { ChainFilterModule } from "../jobs/types"

// Custom TokenTransferred event from SimpleERC20 contracts
const TOKEN_TRANSFERRED_EVENT = parseAbiItem(
  "event TokenTransferred(address indexed from, address indexed to, uint256 value, string name, string symbol, uint8 decimals)",
)

export const createFilter: ChainFilterModule["createFilter"] = (
  chainClient,
  fromBlock,
  log,
) => {
  if (!chainClient) {
    log?.warn("sendToken filter: No chain client provided")
    return null
  }

  try {
    return chainClient.createEventFilter({
      event: TOKEN_TRANSFERRED_EVENT,
      fromBlock,
    })
  } catch (error) {
    log?.error("sendToken filter: Failed to create filter:", error)
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

  log.info(`Processing ${changes.length} TokenTransferred events`)

  for (const change of changes) {
    try {
      const {
        args: { from, to, value, name, symbol, decimals },
        address: tokenAddress,
        transactionHash,
      } = change

      log.debug(
        `Processing TokenTransferred: ${from} -> ${to}, amount: ${value}, token: ${symbol} (${name}) at ${tokenAddress}`,
      )

      // TokenTransferred events are only emitted for actual transfers (not mints/burns)
      // so no need to check for null addresses

      // Look up user by wallet address (sender)
      const [user] = await serverApp.db
        .select()
        .from(users)
        .where(eq(users.wallet, from.toLowerCase()))
        .limit(1)

      if (!user) {
        log.debug(`No user found for wallet ${from}`)
        continue
      }

      // Token information is already available from the custom event
      const tokenInfo = {
        name,
        symbol,
        decimals,
      }

      log.debug(
        `Using token metadata from event for ${tokenAddress}: ${symbol} (${name}) with ${decimals} decimals`,
      )

      // Format amount (convert from wei)
      const amount = Number(value) / Math.pow(10, tokenInfo.decimals)
      const formattedAmount = amount.toFixed(2)

      // Create notification for the user using the new serverApp method
      try {
        await serverApp.createNotification(user.id, {
          type: NotificationType.TOKEN_TRANSFER,
          message: `Sent ${formattedAmount} ${tokenInfo.symbol} (${tokenInfo.name}) to ${to}`,
          transactionHash,
          tokenAddress: tokenAddress.toLowerCase(),
          from,
          to,
          amount: value.toString(),
          tokenSymbol: tokenInfo.symbol,
          tokenName: tokenInfo.name,
        })

        log.info(
          `Successfully created notification for user ${user.id} for token transfer`,
        )
      } catch (notificationError) {
        log.error(
          `Failed to create notification for user ${user.id}:`,
          notificationError,
        )
      }
    } catch (error) {
      log.error("Error processing Transfer event:", error)
    }
  }
}
