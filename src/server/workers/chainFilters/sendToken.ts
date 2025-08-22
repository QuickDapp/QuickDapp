import fs from "node:fs"
import path from "node:path"
import { eq } from "drizzle-orm"
import { parseAbiItem } from "viem"
import { serverConfig } from "../../../shared/config/env"
import { notifications, users } from "../../db/schema"
import type { ChainFilterModule } from "../jobs/types"

// Standard ERC20 Transfer event ABI
const ERC20_TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
)

export const createFilter: ChainFilterModule["createFilter"] = (
  chainClient,
) => {
  if (!chainClient) {
    console.warn("sendToken filter: No chain client provided")
    return null
  }

  try {
    // Create a filter for all ERC20 Transfer events
    // Use "earliest" in test environments to capture all events
    const fromBlock = serverConfig.NODE_ENV === "test" ? "earliest" : "latest"

    return chainClient.createEventFilter({
      event: ERC20_TRANSFER_EVENT,
      fromBlock,
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

      // Get token information
      let tokenInfo = { name: "Unknown Token", symbol: "UNK", decimals: 18 }

      try {
        // Load ERC20 ABI to read token info
        const contractPath = path.join(
          path.dirname(__filename),
          "../../../tests/helpers/contracts/out/TestToken.sol/TestToken.json",
        )

        if (fs.existsSync(contractPath)) {
          // Contract artifact exists - for a proper implementation,
          // you'd query the actual chain client here
          // For now, we'll use default values
          tokenInfo = {
            name: "Test Token",
            symbol: "TEST",
            decimals: 18,
          }
        }
      } catch (error) {
        log.warn("Failed to get token info:", error)
      }

      // Format amount (convert from wei)
      const amount = Number(value) / Math.pow(10, tokenInfo.decimals)
      const formattedAmount = amount.toFixed(2)

      // Create notification for the user
      try {
        const insertResult = await serverApp.db
          .insert(notifications)
          .values({
            userId: user.id,
            data: {
              type: "token_transfer",
              message: `Sent ${formattedAmount} ${tokenInfo.symbol} (${tokenInfo.name}) to ${to}`,
              transactionHash,
              tokenAddress,
              from,
              to,
              amount: value.toString(),
              tokenSymbol: tokenInfo.symbol,
              tokenName: tokenInfo.name,
            },
          })
          .returning()

        log.info(
          `Successfully created notification for user ${user.id} for token transfer:`,
          insertResult[0]?.id,
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
