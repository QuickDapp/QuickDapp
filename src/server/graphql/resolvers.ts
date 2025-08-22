import { GraphQLError } from "graphql"
import { type Address } from "viem"
import { serverConfig } from "../../shared/config/env"
import type { AuthenticatedUser } from "../auth"
import {
  getNotificationsForUser,
  getUnreadNotificationsCountForUser,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type PageParam,
} from "../db/notifications"
import { createUserIfNotExists } from "../db/users"
import { GraphQLErrorCode, LOG_CATEGORIES } from "../lib/errors"
import { TokenService } from "../services/tokens"
import type { ServerApp } from "../types"

export interface GraphQLContext {
  serverApp: ServerApp
  user?: AuthenticatedUser
}

/**
 * GraphQL resolvers with standard error handling
 */
export function createResolvers(serverApp: ServerApp) {
  const logger = serverApp.createLogger(LOG_CATEGORIES.GRAPHQL_RESOLVERS)
  const tokenService = new TokenService(serverApp)

  return {
    Query: {
      // Health check queries (no auth required)
      health: () => "OK",
      version: () => serverConfig.APP_VERSION,

      // User notifications (auth required)
      getMyNotifications: async (
        _: unknown,
        { pageParam }: { pageParam: PageParam },
        context: GraphQLContext,
      ) => {
        try {
          // Get or create user record
          const user = await createUserIfNotExists(
            serverApp.db,
            context.user!.wallet,
          )

          // Fetch notifications
          const [notifications, total] = await getNotificationsForUser(
            serverApp.db,
            user.id,
            pageParam,
          )

          logger.debug(
            `Retrieved ${notifications.length} notifications for user ${user.wallet}`,
          )

          return {
            notifications,
            startIndex: pageParam.startIndex,
            total,
          }
        } catch (error) {
          logger.error("Failed to get notifications:", error)
          throw new GraphQLError("Failed to retrieve notifications", {
            extensions: {
              code: GraphQLErrorCode.DATABASE_ERROR,
              originalError:
                error instanceof Error ? error.message : String(error),
            },
          })
        }
      },

      getMyUnreadNotificationsCount: async (
        _: unknown,
        __: unknown,
        context: GraphQLContext,
      ) => {
        try {
          // Get or create user record
          const user = await createUserIfNotExists(
            serverApp.db,
            context.user!.wallet,
          )

          const count = await getUnreadNotificationsCountForUser(
            serverApp.db,
            user.id,
          )

          logger.debug(`User ${user.wallet} has ${count} unread notifications`)

          return count
        } catch (error) {
          logger.error("Failed to get unread notifications count:", error)
          // For count queries, return 0 on error rather than throwing
          return 0
        }
      },

      // Token queries (auth required)
      getMyTokens: async (_: unknown, __: unknown, context: GraphQLContext) => {
        try {
          const userAddress = context.user!.wallet as Address
          const tokens = await tokenService.getUserTokens(userAddress)

          // Add createdAt timestamp (mock for now - in real app you'd track this)
          const tokensWithTimestamp = tokens.map((token) => ({
            ...token,
            createdAt: new Date().toISOString(),
          }))

          logger.debug(
            `Retrieved ${tokens.length} tokens for user ${userAddress}`,
          )

          return {
            tokens: tokensWithTimestamp,
            total: tokens.length,
          }
        } catch (error) {
          logger.error("Failed to get user tokens:", error)
          throw new GraphQLError("Failed to retrieve tokens", {
            extensions: {
              code: GraphQLErrorCode.DATABASE_ERROR,
              originalError:
                error instanceof Error ? error.message : String(error),
            },
          })
        }
      },

      getTokenInfo: async (
        _: unknown,
        { address }: { address: string },
        context: GraphQLContext,
      ) => {
        try {
          const userAddress = context.user!.wallet as Address
          const tokenInfo = await tokenService.getTokenInfo(
            address as Address,
            userAddress,
          )

          if (!tokenInfo) {
            return null
          }

          return {
            ...tokenInfo,
            createdAt: new Date().toISOString(),
          }
        } catch (error) {
          logger.error(`Failed to get token info for ${address}:`, error)
          return null
        }
      },

      getTokenCount: async (
        _: unknown,
        __: unknown,
        context: GraphQLContext,
      ) => {
        try {
          const userAddress = context.user!.wallet as Address
          const tokens = await tokenService.getUserTokens(userAddress)
          return tokens.length
        } catch (error) {
          logger.error("Failed to get token count:", error)
          return 0
        }
      },
    },

    Mutation: {
      markNotificationAsRead: async (
        _: unknown,
        { id }: { id: number },
        context: GraphQLContext,
      ) => {
        try {
          // Get or create user record
          const user = await createUserIfNotExists(
            serverApp.db,
            context.user!.wallet,
          )

          const success = await markNotificationAsRead(
            serverApp.db,
            user.id,
            id,
          )

          if (!success) {
            throw new GraphQLError(
              "Notification not found or not owned by user",
              {
                extensions: { code: GraphQLErrorCode.NOT_FOUND },
              },
            )
          }

          logger.debug(
            `Marked notification ${id} as read for user ${user.wallet}`,
          )

          return { success: true }
        } catch (error) {
          if (error instanceof GraphQLError) {
            throw error
          }

          logger.error("Failed to mark notification as read:", error)
          throw new GraphQLError("Failed to mark notification as read", {
            extensions: {
              code: GraphQLErrorCode.DATABASE_ERROR,
              originalError:
                error instanceof Error ? error.message : String(error),
            },
          })
        }
      },

      markAllNotificationsAsRead: async (
        _: unknown,
        __: unknown,
        context: GraphQLContext,
      ) => {
        try {
          // Get or create user record
          const user = await createUserIfNotExists(
            serverApp.db,
            context.user!.wallet,
          )

          const updatedCount = await markAllNotificationsAsRead(
            serverApp.db,
            user.id,
          )

          logger.debug(
            `Marked ${updatedCount} notifications as read for user ${user.wallet}`,
          )

          return { success: true }
        } catch (error) {
          logger.error("Failed to mark all notifications as read:", error)
          throw new GraphQLError("Failed to mark all notifications as read", {
            extensions: {
              code: GraphQLErrorCode.DATABASE_ERROR,
              originalError:
                error instanceof Error ? error.message : String(error),
            },
          })
        }
      },

      // Token mutations (auth required)
      createToken: async (
        _: unknown,
        {
          input,
        }: {
          input: {
            name: string
            symbol: string
            decimals: number
            initialSupply: string
          }
        },
        context: GraphQLContext,
      ) => {
        try {
          const userAddress = context.user!.wallet as Address

          // Note: This is a simplified implementation
          // In a real app, the frontend would handle the transaction signing
          // and send the transaction hash to the server for confirmation

          logger.info(`Token creation requested by user ${userAddress}`, {
            name: input.name,
            symbol: input.symbol,
            decimals: input.decimals,
            initialSupply: input.initialSupply,
          })

          // For now, return success with a placeholder response
          // The actual implementation would involve the frontend handling the transaction
          return {
            success: true,
            tokenAddress: null,
            transactionHash: null,
            error:
              "Frontend integration required - tokens must be created through wallet interaction",
          }
        } catch (error) {
          logger.error("Failed to create token:", error)
          return {
            success: false,
            tokenAddress: null,
            transactionHash: null,
            error:
              error instanceof Error ? error.message : "Failed to create token",
          }
        }
      },

      transferToken: async (
        _: unknown,
        {
          input,
        }: { input: { tokenAddress: string; to: string; amount: string } },
        context: GraphQLContext,
      ) => {
        try {
          const userAddress = context.user!.wallet as Address

          logger.info(`Token transfer requested by user ${userAddress}`, {
            tokenAddress: input.tokenAddress,
            to: input.to,
            amount: input.amount,
          })

          // For now, return success with a placeholder response
          // The actual implementation would involve the frontend handling the transaction
          return {
            success: true,
            transactionHash: null,
            error:
              "Frontend integration required - transfers must be done through wallet interaction",
          }
        } catch (error) {
          logger.error("Failed to transfer token:", error)
          return {
            success: false,
            transactionHash: null,
            error:
              error instanceof Error
                ? error.message
                : "Failed to transfer token",
          }
        }
      },
    },
  }
}
