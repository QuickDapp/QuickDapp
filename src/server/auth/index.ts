import { GraphQLError } from "graphql"
import { jwtVerify, SignJWT } from "jose"
import { SiweMessage } from "siwe"
import { serverConfig } from "../../shared/config/env"
import { GraphQLErrorCode, LOG_CATEGORIES } from "../lib/errors"
import type { Logger } from "../lib/logger"
import type { ServerApp } from "../types"

// Get JWT secret dynamically to ensure it uses current environment
function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(serverConfig.SESSION_ENCRYPTION_KEY)
}

export interface AuthenticatedUser {
  wallet: string
}

export interface AuthenticationResult {
  token: string
  wallet: string
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
   * Verify SIWE message and signature, return JWT token
   */
  async authenticateWithSiwe(
    message: string,
    signature: string,
  ): Promise<AuthenticationResult> {
    try {
      this.logger.debug(
        `Authenticating SIWE message for domain: ${JSON.parse(message).domain}`,
      )

      const siwe = new SiweMessage(message)

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

      // Create JWT token
      const token = await new SignJWT({
        wallet: siwe.address.toLowerCase(),
        iat: Math.floor(Date.now() / 1000),
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("24h")
        .sign(getJwtSecret())

      const user: AuthenticatedUser = {
        wallet: siwe.address.toLowerCase(),
      }

      this.logger.debug(
        `SIWE authentication successful for wallet: ${user.wallet}`,
      )

      return {
        token,
        wallet: siwe.address.toLowerCase(),
        user,
      }
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error
      }

      this.logger.error("SIWE authentication failed:", error)
      throw new GraphQLError("Authentication failed", {
        extensions: {
          code: GraphQLErrorCode.UNAUTHORIZED,
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

      if (!payload.wallet || typeof payload.wallet !== "string") {
        this.logger.debug(`Token payload missing wallet:`, payload)
        throw new GraphQLError("Invalid token payload", {
          extensions: { code: GraphQLErrorCode.UNAUTHORIZED },
        })
      }

      this.logger.debug(`Token verified for wallet: ${payload.wallet}`)
      return {
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

    const match = authHeader.match(/^Bearer (.+)$/)
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
