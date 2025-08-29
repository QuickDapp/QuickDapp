import { eq } from "drizzle-orm"
import { parseAbiItem } from "viem"
import { fetchTokenMetadata } from "../../../shared/contracts"
import { NotificationType } from "../../../shared/notifications/types"
import { users } from "../../db/schema"
import type { ChainFilterModule } from "../jobs/types"

// Standard ERC20 Transfer event ABI
const ERC20_TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
)

export const createFilter: ChainFilterModule["createFilter"] = (
  chainClient,
  fromBlock,
) => {
  if (!chainClient) {
    console.warn("sendToken filter: No chain client provided")
    return null
  }

  try {
    // Create a filter for all ERC20 Transfer events
    // fromBlock is managed by watchChain.ts based on filter state
    const blockToUse = fromBlock !== undefined ? fromBlock : "latest"

    return chainClient.createEventFilter({
      event: ERC20_TRANSFER_EVENT,
      fromBlock: blockToUse,
    })
  } catch (error) {
    console.error("sendToken filter: Failed to create filter:", error)
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

  log.info(`Processing ${changes.length} Transfer events`)

  for (const change of changes) {
    try {
      const {
        args: { from, to, value },
        address: tokenAddress,
        transactionHash,
      } = change

      log.debug(
        `Processing Transfer: ${from} -> ${to}, amount: ${value}, token: ${tokenAddress}`,
      )

      // Skip null addresses (minting/burning)
      if (
        from === "0x0000000000000000000000000000000000000000" ||
        to === "0x0000000000000000000000000000000000000000"
      ) {
        continue
      }

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

      // Get token information from the blockchain using public client
      // If this fails, the whole job should fail since we need accurate token data
      const metadata = await fetchTokenMetadata(
        tokenAddress,
        serverApp.publicClient,
      )

      const tokenInfo = {
        name: metadata.name,
        symbol: metadata.symbol,
        decimals: metadata.decimals,
      }

      log.debug(
        `Fetched token metadata for ${tokenAddress}: ${metadata.symbol} (${metadata.name}) with ${metadata.decimals} decimals`,
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
          tokenAddress,
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
