import { eq } from "drizzle-orm"
import { parseAbiItem } from "viem"
import { serverConfig } from "../../../shared/config/server"
import { fetchTokenMetadata } from "../../../shared/contracts"
import { users } from "../../db/schema"
import type { ChainFilterModule } from "../jobs/types"

// For token creation, we'll monitor contract deployments
// In a real implementation, this might be a factory contract event
// For our test setup, we'll monitor for the first Transfer event from address(0) which indicates minting
const ERC20_MINT_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
)

export const createFilter: ChainFilterModule["createFilter"] = (
  chainClient,
) => {
  if (!chainClient) {
    console.warn("createToken filter: No chain client provided")
    return null
  }

  try {
    // Create a filter for Transfer events from address(0) (minting events)
    // This effectively catches token creation/initial minting
    // Use "earliest" in test environments to capture all events
    const fromBlock = serverConfig.NODE_ENV === "test" ? "earliest" : "latest"

    return chainClient.createEventFilter({
      event: ERC20_MINT_EVENT,
      args: {
        from: "0x0000000000000000000000000000000000000000",
      },
      fromBlock,
    })
  } catch (error) {
    console.error("createToken filter: Failed to create filter:", error)
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

  log.info(`Processing ${changes.length} token creation events`)

  for (const change of changes) {
    try {
      const {
        args: { from, to, value },
        address: tokenAddress,
        transactionHash,
      } = change

      // We only care about minting events (from address(0))
      if (from !== "0x0000000000000000000000000000000000000000") {
        continue
      }

      log.debug(
        `Processing token creation: ${tokenAddress}, initial mint to: ${to}, amount: ${value}`,
      )

      // Get transaction details to find the creator
      // For simplicity in tests, we'll use the 'to' address as the creator
      const creatorAddress = to

      // Look up user by wallet address
      const [user] = await serverApp.db
        .select()
        .from(users)
        .where(eq(users.wallet, creatorAddress.toLowerCase()))
        .limit(1)

      if (!user) {
        log.debug(`No user found for wallet ${creatorAddress}`)
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

      // Create notification for the user using the new serverApp method
      await serverApp.createNotification(user.id, {
        type: "token_created",
        message: `Created new token ${tokenInfo.symbol} (${tokenInfo.name}) at ${tokenAddress}`,
        transactionHash,
        tokenAddress,
        creator: creatorAddress,
        initialSupply: value.toString(),
        tokenSymbol: tokenInfo.symbol,
        tokenName: tokenInfo.name,
      })

      log.info(
        `Created notification for user ${user.id} for new token creation`,
      )

      // In v2, this would also send an email notification
      // For v3, we'll add a TODO comment for future implementation
      log.debug(
        `TODO: Send email notification for token creation to user ${user.id}`,
      )
    } catch (error) {
      log.error("Error processing token creation event:", error)
    }
  }
}
