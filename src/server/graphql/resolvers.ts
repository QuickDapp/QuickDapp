import { GraphQLError } from "graphql"
import { SiweMessage } from "siwe"
import { serverConfig } from "../../shared/config/server"
import { GraphQLErrorCode } from "../../shared/graphql/errors"
import { AuthService } from "../auth"
import {
  getNotificationsForUser,
  getUnreadNotificationsCountForUser,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../db/notifications"
import { getUser } from "../db/users"
import { getChainId } from "../lib/chains"
import {
  generateVerificationCodeAndBlob,
  validateEmailFormat,
} from "../lib/emailVerification"
import { LOG_CATEGORIES } from "../lib/logger"
import { Mailer } from "../lib/mailer"
import { setSentryUser } from "../lib/sentry"
import type { ServerApp } from "../types"
import type { Resolvers } from "./types"

/**
 * GraphQL resolvers with standard error handling
 */
export function createResolvers(serverApp: ServerApp): Resolvers {
  const logger = serverApp.createLogger(LOG_CATEGORIES.GRAPHQL_RESOLVERS)

  /**
   * Helper to wrap resolver execution with Sentry span and user context
   */
  const withSpan = async <T>(
    spanName: string,
    context: any,
    callback: () => Promise<T>,
  ): Promise<T> => {
    return serverApp.startSpan(spanName, async (span) => {
      if (context.user) {
        setSentryUser({ id: context.user.id, wallet: context.user.wallet })
        span.setAttributes({
          "user.id": context.user.id,
          "user.wallet": context.user.wallet,
        })
      }
      return callback()
    })
  }

  // Helper function to get authenticated user and validate they exist
  const getAuthenticatedUser = async (context: any) => {
    if (!context.user) {
      throw new GraphQLError("Authentication required", {
        extensions: { code: GraphQLErrorCode.UNAUTHORIZED },
      })
    }

    const user = await getUser(serverApp.db, context.user.wallet)
    if (!user) {
      throw new GraphQLError("User not found", {
        extensions: { code: GraphQLErrorCode.NOT_FOUND },
      })
    }

    return user
  }

  return {
    Query: {
      // Token validation (requires auth header, but validates it)
      validateToken: async (_, __, context) => {
        return withSpan("graphql.Query.validateToken", context, async () => {
          try {
            if (context.user) {
              return {
                valid: true,
                wallet: context.user.wallet,
              }
            } else {
              return {
                valid: false,
                wallet: null,
              }
            }
          } catch (error) {
            const logger = serverApp.createLogger(LOG_CATEGORIES.AUTH)
            logger.error("Error validating token:", error)
            return {
              valid: false,
              wallet: null,
            }
          }
        })
      },

      // User notifications (auth required)
      getMyNotifications: async (_, { pageParam }, context) => {
        return withSpan(
          "graphql.Query.getMyNotifications",
          context,
          async () => {
            try {
              const user = await getAuthenticatedUser(context)

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
        )
      },

      getMyUnreadNotificationsCount: async (_, __, context) => {
        return withSpan(
          "graphql.Query.getMyUnreadNotificationsCount",
          context,
          async () => {
            try {
              const user = await getAuthenticatedUser(context)

              const count = await getUnreadNotificationsCountForUser(
                serverApp.db,
                user.id,
              )

              logger.debug(
                `User ${user.wallet} has ${count} unread notifications`,
              )

              return count
            } catch (error) {
              logger.error("Failed to get unread notifications count:", error)
              // For count queries, return 0 on error rather than throwing
              return 0
            }
          },
        )
      },
    },

    Mutation: {
      // Authentication mutations (no auth required)
      generateSiweMessage: async (_, { address }, context) => {
        return withSpan(
          "graphql.Mutation.generateSiweMessage",
          context,
          async () => {
            try {
              const logger = serverApp.createLogger(LOG_CATEGORIES.AUTH)
              logger.debug(`Generating SIWE message for address: ${address}`)

              const message = new SiweMessage({
                domain: new URL(serverConfig.BASE_URL).hostname,
                address,
                statement: "Sign in to QuickDapp",
                uri: serverConfig.BASE_URL,
                version: "1",
                chainId: getChainId(),
                nonce: Math.random().toString(36).substring(2, 15),
              })

              const messageString = message.prepareMessage()

              return {
                message: messageString,
                nonce: message.nonce || "",
              }
            } catch (error) {
              logger.error("Failed to generate SIWE message:", error)
              throw new GraphQLError("Failed to generate SIWE message", {
                extensions: {
                  code: GraphQLErrorCode.INTERNAL_ERROR,
                },
              })
            }
          },
        )
      },

      authenticateWithSiwe: async (_, { message, signature }, context) => {
        return withSpan(
          "graphql.Mutation.authenticateWithSiwe",
          context,
          async () => {
            try {
              const logger = serverApp.createLogger(LOG_CATEGORIES.AUTH)
              const authService = new AuthService(serverApp)

              logger.debug("Authenticating with SIWE message")

              const authResult = await authService.authenticateWithSiwe(
                message,
                signature,
              )

              return {
                success: true,
                token: authResult.token,
                wallet: authResult.user.wallet,
                error: null,
              }
            } catch (error) {
              logger.error("SIWE authentication failed:", error)

              // Return error in result rather than throwing for better UX
              return {
                success: false,
                token: null,
                wallet: null,
                error:
                  error instanceof Error
                    ? error.message
                    : "Authentication failed",
              }
            }
          },
        )
      },

      sendEmailVerificationCode: async (
        _: any,
        { email }: { email: string },
        context: any,
      ) => {
        return withSpan(
          "graphql.Mutation.sendEmailVerificationCode",
          context,
          async () => {
            try {
              const authLogger = serverApp.createLogger(LOG_CATEGORIES.AUTH)

              if (!validateEmailFormat(email)) {
                return {
                  success: false,
                  blob: null,
                  error: "Invalid email format",
                }
              }

              authLogger.debug("Generating email verification code")

              const { code, blob } = await generateVerificationCodeAndBlob(
                authLogger,
                email,
              )

              const mailer = new Mailer(authLogger)
              await mailer.send({
                to: email,
                subject: "Your verification code",
                text: `Your verification code is: ${code}`,
                html: `<p>Your verification code is: <strong>${code}</strong></p>`,
              })

              authLogger.debug("Email verification code sent")

              return {
                success: true,
                blob,
                error: null,
              }
            } catch (error) {
              logger.error("Failed to send email verification code:", error)

              return {
                success: false,
                blob: null,
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to send verification code",
              }
            }
          },
        )
      },

      authenticateWithEmail: async (
        _: any,
        { email, code, blob }: { email: string; code: string; blob: string },
        context: any,
      ) => {
        return withSpan(
          "graphql.Mutation.authenticateWithEmail",
          context,
          async () => {
            try {
              const authLogger = serverApp.createLogger(LOG_CATEGORIES.AUTH)
              const authService = new AuthService(serverApp)

              authLogger.debug("Authenticating with email verification code")

              const authResult = await authService.authenticateWithEmail(
                email,
                code,
                blob,
              )

              return {
                success: true,
                token: authResult.token,
                wallet: authResult.user.wallet,
                error: null,
              }
            } catch (error) {
              logger.error("Email authentication failed:", error)

              return {
                success: false,
                token: null,
                wallet: null,
                error:
                  error instanceof Error
                    ? error.message
                    : "Authentication failed",
              }
            }
          },
        )
      },

      markNotificationAsRead: async (_, { id }, context) => {
        return withSpan(
          "graphql.Mutation.markNotificationAsRead",
          context,
          async () => {
            try {
              const user = await getAuthenticatedUser(context)

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
        )
      },

      markAllNotificationsAsRead: async (_, __, context) => {
        return withSpan(
          "graphql.Mutation.markAllNotificationsAsRead",
          context,
          async () => {
            try {
              const user = await getAuthenticatedUser(context)

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
              throw new GraphQLError(
                "Failed to mark all notifications as read",
                {
                  extensions: {
                    code: GraphQLErrorCode.DATABASE_ERROR,
                    originalError:
                      error instanceof Error ? error.message : String(error),
                  },
                },
              )
            }
          },
        )
      },
    },
  }
}
