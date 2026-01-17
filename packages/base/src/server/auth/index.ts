import { GraphQLError } from "graphql"
import { jwtVerify, SignJWT } from "jose"
import { serverConfig } from "../../shared/config/server"
import { type OAuthMethod } from "../../shared/constants"
import { GraphQLErrorCode } from "../../shared/graphql/errors"
import {
  createEmailUserIfNotExists,
  createOAuthUserIfNotExists,
  getUserById,
} from "../db/users"
import { verifyCodeWithBlob } from "../lib/emailVerification"
import { AccountDisabledError } from "../lib/errors"
import type { Logger } from "../lib/logger"
import { LOG_CATEGORIES } from "../lib/logger"
import type { ServerApp } from "../types"

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(serverConfig.SESSION_ENCRYPTION_KEY)
}

export interface AuthenticatedUser {
  id: number
}

export interface AuthenticationResult {
  token: string
  user: AuthenticatedUser
}

/**
 * Authentication service for handling email, OAuth, and JWT token operations
 */
export class AuthService {
  private logger: Logger

  constructor(private serverApp: ServerApp) {
    this.logger = serverApp.createLogger(LOG_CATEGORIES.AUTH)
  }

  /**
   * Generate JWT token for a user
   */
  private async generateToken(userId: number): Promise<string> {
    const now = Date.now()
    const payload: Record<string, unknown> = {
      type: "auth",
      userId,
      iat: Math.floor(now / 1000),
      iatMs: now,
      jti: `${now}-${Math.random().toString(36).substring(2, 11)}`,
    }

    return new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("24h")
      .sign(getJwtSecret())
  }

  /**
   * Check if user is disabled and throw if so
   */
  private async checkUserNotDisabled(userId: number): Promise<void> {
    const user = await getUserById(this.serverApp.db, userId)
    if (user?.disabled) {
      this.logger.debug(`User ${userId} is disabled, blocking authentication`)
      throw new GraphQLError("Account is disabled", {
        extensions: { code: GraphQLErrorCode.ACCOUNT_DISABLED },
      })
    }
  }

  /**
   * Authenticate with email verification code
   */
  async authenticateWithEmail(
    email: string,
    code: string,
    blob: string,
  ): Promise<AuthenticationResult> {
    try {
      this.logger.debug("Authenticating with email verification code")

      // Verify the code against the blob
      const verifiedEmail = await verifyCodeWithBlob(this.logger, blob, code)

      // Ensure email matches
      if (verifiedEmail.toLowerCase() !== email.toLowerCase()) {
        throw new GraphQLError("Email mismatch", {
          extensions: { code: GraphQLErrorCode.AUTHENTICATION_FAILED },
        })
      }

      // Get or create user
      const dbUser = await createEmailUserIfNotExists(
        this.serverApp.db,
        verifiedEmail,
      )

      // Check if user is disabled
      await this.checkUserNotDisabled(dbUser.id)

      // Create JWT token
      const token = await this.generateToken(dbUser.id)

      const user: AuthenticatedUser = {
        id: dbUser.id,
      }

      this.logger.debug(`Email authentication successful for user: ${user.id}`)

      return { token, user }
    } catch (error) {
      if (
        error instanceof GraphQLError ||
        error instanceof AccountDisabledError
      ) {
        throw error
      }

      this.logger.error("Email authentication failed:", error)

      throw new GraphQLError(
        error instanceof Error ? error.message : "Authentication failed",
        {
          extensions: {
            code: GraphQLErrorCode.AUTHENTICATION_FAILED,
          },
        },
      )
    }
  }

  /**
   * Authenticate with OAuth provider
   */
  async authenticateWithOAuth(
    provider: OAuthMethod,
    email: string | undefined,
    providerUserId: string,
  ): Promise<AuthenticationResult> {
    try {
      this.logger.debug(`Authenticating with OAuth provider: ${provider}`)

      // Get or create user
      const dbUser = await createOAuthUserIfNotExists(
        this.serverApp.db,
        provider,
        email,
        providerUserId,
      )

      // Check if user is disabled
      await this.checkUserNotDisabled(dbUser.id)

      // Create JWT token
      const token = await this.generateToken(dbUser.id)

      const user: AuthenticatedUser = {
        id: dbUser.id,
      }

      this.logger.debug(`OAuth authentication successful for user: ${user.id}`)

      return { token, user }
    } catch (error) {
      if (
        error instanceof GraphQLError ||
        error instanceof AccountDisabledError
      ) {
        throw error
      }

      this.logger.error("OAuth authentication failed:", error)

      throw new GraphQLError(
        error instanceof Error ? error.message : "Authentication failed",
        {
          extensions: {
            code: GraphQLErrorCode.AUTHENTICATION_FAILED,
          },
        },
      )
    }
  }

  /**
   * Verify JWT token and return user info
   */
  async verifyToken(token: string): Promise<AuthenticatedUser> {
    try {
      this.logger.debug(`Verifying token: ${token.substring(0, 20)}...`)

      const { payload } = await jwtVerify(token, getJwtSecret())

      if (payload.type !== "auth") {
        this.logger.debug(
          `Token type mismatch: expected "auth", got "${payload.type}"`,
        )
        throw new GraphQLError("Invalid token type", {
          extensions: { code: GraphQLErrorCode.UNAUTHORIZED },
        })
      }

      if (!payload.userId || typeof payload.userId !== "number") {
        this.logger.debug(`Token payload missing userId:`, payload)
        throw new GraphQLError("Invalid token payload", {
          extensions: { code: GraphQLErrorCode.UNAUTHORIZED },
        })
      }

      this.logger.debug(`Token verified for user ${payload.userId}`)

      return {
        id: payload.userId,
      }
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error
      }

      this.logger.debug(`Token verification failed:`, error)

      if (error instanceof Error && error.message.includes("exp")) {
        throw new GraphQLError("Token expired", {
          extensions: { code: GraphQLErrorCode.UNAUTHORIZED },
        })
      }

      throw new GraphQLError("Invalid token", {
        extensions: { code: GraphQLErrorCode.UNAUTHORIZED },
      })
    }
  }

  /**
   * Extract bearer token from Authorization header
   */
  extractBearerToken(authHeader: string | null): string | null {
    if (!authHeader) return null

    const match = authHeader.match(/^Bearer ([^\s]+)$/)
    return (match ? match[1] : null) || null
  }

  /**
   * Authenticate request and return user or throw error
   */
  async authenticateRequest(request: Request): Promise<AuthenticatedUser> {
    const authHeader = request.headers.get("Authorization")
    const token = this.extractBearerToken(authHeader)

    if (!token) {
      this.logger.debug("No authorization token provided")
      throw new GraphQLError("Authentication required", {
        extensions: { code: GraphQLErrorCode.UNAUTHORIZED },
      })
    }

    return await this.verifyToken(token)
  }
}
