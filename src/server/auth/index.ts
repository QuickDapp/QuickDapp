import { GraphQLError } from "graphql"
import { jwtVerify, SignJWT } from "jose"
import { SiweMessage } from "siwe"
import { serverConfig } from "../../shared/config/server"
import { getUser } from "../db/users"
import { GraphQLErrorCode, LOG_CATEGORIES } from "../lib/errors"
import type { Logger } from "../lib/logger"
import type { ServerApp } from "../types"

// Get JWT secret dynamically to ensure it uses current environment
function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(serverConfig.SESSION_ENCRYPTION_KEY)
}

export interface AuthenticatedUser {
  id: number
  wallet: string
}

export interface AuthenticationResult {
  token: string
  user: AuthenticatedUser
}

/**
 * Authentication service for handling SIWE and JWT token operations
 */
export class AuthService {
  private logger: Logger

  constructor(private serverApp: ServerApp) {
    this.logger = serverApp.createLogger(LOG_CATEGORIES.AUTH)
  }

  /**
   * Get user by wallet address
   */
  async getUserByWallet(wallet: string) {
    return await getUser(this.serverApp.db, wallet)
  }

  /**
   * Verify SIWE message and signature, return JWT token
   */
  async authenticateWithSiwe(
    message: string,
    signature: string,
  ): Promise<AuthenticationResult> {
    try {
      const siwe = new SiweMessage(message)

      this.logger.debug(
        `Authenticating SIWE message for domain: ${siwe.domain}`,
      )

      const result = await siwe.verify({
        signature,
        // In test environment, don't verify domain to allow test domains
        ...(serverConfig.NODE_ENV === "test" ? {} : { domain: siwe.domain }),
        nonce: siwe.nonce,
      })

      if (!result.success) {
        this.logger.debug(
          `SIWE verification failed for address: ${siwe.address}`,
        )
        throw new GraphQLError("Invalid signature", {
          extensions: { code: GraphQLErrorCode.INVALID_SIGNATURE },
        })
      }

      // Get user from database
      const dbUser = await this.getUserByWallet(siwe.address)
      if (!dbUser) {
        throw new GraphQLError("User not found", {
          extensions: { code: GraphQLErrorCode.UNAUTHORIZED },
        })
      }

      // Create JWT token with user ID and wallet
      const now = Date.now()
      const token = await new SignJWT({
        userId: dbUser.id,
        wallet: dbUser.wallet,
        iat: Math.floor(now / 1000),
        // Add microsecond precision to ensure uniqueness in concurrent requests
        iatMs: now,
        // Add a random nonce for additional entropy
        jti: `${now}-${Math.random().toString(36).substring(2, 11)}`,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("24h")
        .sign(getJwtSecret())

      const user: AuthenticatedUser = {
        id: dbUser.id,
        wallet: dbUser.wallet,
      }

      this.logger.debug(
        `SIWE authentication successful for wallet: ${user.wallet}`,
      )

      return {
        token,
        user,
      }
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error
      }

      this.logger.error("SIWE authentication failed:", error)

      // Map specific SIWE errors to appropriate error codes
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase()

        // SIWE message format/validation errors
        if (
          errorMessage.includes("invalid message") ||
          errorMessage.includes("invalid nonce") ||
          (errorMessage.includes("line") && errorMessage.includes("invalid"))
        ) {
          throw new GraphQLError("Invalid SIWE message format", {
            extensions: {
              code: GraphQLErrorCode.AUTHENTICATION_FAILED,
              originalError: error.message,
            },
          })
        }

        // Signature validation errors
        if (
          errorMessage.includes("signature") ||
          errorMessage.includes("address") ||
          errorMessage.includes("verification failed")
        ) {
          throw new GraphQLError("Invalid signature or message", {
            extensions: {
              code: GraphQLErrorCode.AUTHENTICATION_FAILED,
              originalError: error.message,
            },
          })
        }
      }

      // Generic authentication failure for other errors
      throw new GraphQLError("Authentication failed", {
        extensions: {
          code: GraphQLErrorCode.AUTHENTICATION_FAILED,
          originalError: error instanceof Error ? error.message : String(error),
        },
      })
    }
  }

  /**
   * Verify JWT token and return user info
   */
  async verifyToken(token: string): Promise<AuthenticatedUser> {
    try {
      this.logger.debug(`Verifying token: ${token.substring(0, 20)}...`)
      this.logger.debug(
        `JWT secret key configured: ${!!serverConfig.SESSION_ENCRYPTION_KEY}`,
      )
      this.logger.debug(`NODE_ENV: ${serverConfig.NODE_ENV}`)

      const { payload } = await jwtVerify(token, getJwtSecret())

      if (
        !payload.userId ||
        typeof payload.userId !== "number" ||
        !payload.wallet ||
        typeof payload.wallet !== "string"
      ) {
        this.logger.debug(`Token payload missing userId or wallet:`, payload)
        throw new GraphQLError("Invalid token payload", {
          extensions: { code: GraphQLErrorCode.UNAUTHORIZED },
        })
      }

      this.logger.debug(
        `Token verified for user ${payload.userId} (${payload.wallet})`,
      )
      return {
        id: payload.userId,
        wallet: payload.wallet,
      }
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error
      }

      this.logger.debug(`Token verification failed:`, error)

      // Check if it's a JWT expiration error
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
