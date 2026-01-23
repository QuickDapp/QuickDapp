import { GraphQLError } from "graphql"
import { serverConfig } from "../../shared/config/server"
import { GraphQLErrorCode } from "../../shared/graphql/errors"
import { AuthService } from "../auth"
import {
  createAuthorizationParams,
  isProviderConfigured,
  OAuthConfigError,
  type OAuthProvider,
} from "../auth/oauth"
import { encryptOAuthState } from "../auth/oauth-state"
import {
  getNotificationsForUser,
  getUnreadNotificationsCountForUser,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../db/notifications"
import { getMyProfile, getUserById } from "../db/users"
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
        setSentryUser({
          id: context.user.id,
        })
        span.setAttributes({
          "user.id": context.user.id,
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

    const user = await getUserById(serverApp.db, context.user.id)
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
              }
            } else {
              return {
                valid: false,
              }
            }
          } catch (error) {
            const logger = serverApp.createLogger(LOG_CATEGORIES.AUTH)
            logger.error("Error validating token:", error)
            return {
              valid: false,
            }
          }
        })
      },

      // Current user profile (auth required)
      me: async (_, __, context) => {
        return withSpan("graphql.Query.me", context, async () => {
          try {
            if (!context.user) {
              throw new GraphQLError("Authentication required", {
                extensions: { code: GraphQLErrorCode.UNAUTHORIZED },
              })
            }

            const profile = await getMyProfile(serverApp.db, context.user.id)
            if (!profile) {
              throw new GraphQLError("User not found", {
                extensions: { code: GraphQLErrorCode.NOT_FOUND },
              })
            }

            return profile
          } catch (error) {
            if (error instanceof GraphQLError) {
              throw error
            }
            logger.error("Failed to get user profile:", error)
            throw new GraphQLError("Failed to retrieve user profile", {
              extensions: {
                code: GraphQLErrorCode.DATABASE_ERROR,
                originalError:
                  error instanceof Error ? error.message : String(error),
              },
            })
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
                `Retrieved ${notifications.length} notifications for user ${user.id}`,
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

              logger.debug(`User ${user.id} has ${count} unread notifications`)

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

              const profile = await getMyProfile(
                serverApp.db,
                authResult.user.id,
              )

              return {
                success: true,
                token: authResult.token,
                profile: profile ?? null,
                error: null,
              }
            } catch (error) {
              logger.error("Email authentication failed:", error)

              return {
                success: false,
                token: null,
                profile: null,
                error:
                  error instanceof Error
                    ? error.message
                    : "Authentication failed",
              }
            }
          },
        )
      },

      getOAuthLoginUrl: async (
        _: any,
        {
          provider,
          redirectUrl,
        }: { provider: OAuthProvider; redirectUrl?: string | null },
        context: any,
      ) => {
        return withSpan(
          "graphql.Mutation.getOAuthLoginUrl",
          context,
          async () => {
            try {
              const authLogger = serverApp.createLogger(LOG_CATEGORIES.AUTH)

              // Check if provider is configured
              if (!isProviderConfigured(provider)) {
                return {
                  success: false,
                  url: null,
                  provider: null,
                  error: `OAuth provider ${provider} is not configured`,
                }
              }

              // Validate redirectUrl is same-origin if provided
              if (redirectUrl) {
                try {
                  const redirectUrlObj = new URL(redirectUrl)
                  const apiUrlObj = new URL(serverConfig.API_URL)
                  if (redirectUrlObj.origin !== apiUrlObj.origin) {
                    return {
                      success: false,
                      url: null,
                      provider: null,
                      error: "Redirect URL must be same-origin",
                    }
                  }
                } catch {
                  return {
                    success: false,
                    url: null,
                    provider: null,
                    error: "Invalid redirect URL",
                  }
                }
              }

              authLogger.debug(`Generating OAuth login URL for ${provider}`)

              // Generate auth params with placeholder state to get codeVerifier
              const authParams = createAuthorizationParams(
                provider,
                "placeholder",
              )

              // Create encrypted state containing provider, codeVerifier, and redirectUrl
              const encryptedState = await encryptOAuthState(
                provider,
                authParams.codeVerifier,
                redirectUrl ?? undefined,
              )

              // Replace placeholder state in URL with encrypted state
              const url = new URL(authParams.url.toString())
              url.searchParams.set("state", encryptedState)

              return {
                success: true,
                url: url.toString(),
                provider,
                error: null,
              }
            } catch (error) {
              logger.error(
                `OAuth login URL generation failed for ${provider}:`,
                error,
              )

              if (error instanceof OAuthConfigError) {
                return {
                  success: false,
                  url: null,
                  provider: null,
                  error: error.message,
                }
              }

              return {
                success: false,
                url: null,
                provider: null,
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to generate OAuth login URL",
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
                `Marked notification ${id} as read for user ${user.id}`,
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
                `Marked ${updatedCount} notifications as read for user ${user.id}`,
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
