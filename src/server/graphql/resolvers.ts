import { GraphQLError } from "graphql"
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
    },
  }
}
