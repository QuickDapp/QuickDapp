import { GraphQLError } from "graphql"
import { jwtVerify, SignJWT } from "jose"
import { SiweMessage } from "siwe"
import { serverConfig } from "../../shared/config/env"

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
 * Verify SIWE message and signature, return JWT token
 */
export async function authenticateWithSiwe(
  message: string,
  signature: string,
): Promise<AuthenticationResult> {
  try {
    const siwe = new SiweMessage(message)

    const result = await siwe.verify({
      signature,
      domain: siwe.domain,
      nonce: siwe.nonce,
    })

    if (!result.success) {
      throw new GraphQLError("Invalid signature", {
        extensions: { code: "INVALID_SIGNATURE" },
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

    return {
      token,
      wallet: siwe.address.toLowerCase(),
      user,
    }
  } catch (error) {
    if (error instanceof GraphQLError) {
      throw error
    }

    throw new GraphQLError("Authentication failed", {
      extensions: {
        code: "AUTHENTICATION_FAILED",
        originalError: error instanceof Error ? error.message : String(error),
      },
    })
  }
}

/**
 * Verify JWT token and return user info
 */
export async function verifyToken(
  token: string,
): Promise<AuthenticatedUser | null> {
  try {
    console.log(`[AUTH DEBUG] Verifying token: ${token.substring(0, 20)}...`)
    console.log(
      `[AUTH DEBUG] JWT secret key: ${serverConfig.SESSION_ENCRYPTION_KEY}`,
    )
    console.log(`[AUTH DEBUG] NODE_ENV: ${process.env.NODE_ENV}`)

    const { payload } = await jwtVerify(token, getJwtSecret())

    if (!payload.wallet || typeof payload.wallet !== "string") {
      console.log(`[AUTH DEBUG] Token payload missing wallet:`, payload)
      return null
    }

    console.log(`[AUTH DEBUG] Token verified for wallet: ${payload.wallet}`)
    return {
      wallet: payload.wallet,
    }
  } catch (error) {
    console.log(`[AUTH DEBUG] Token verification failed:`, error)
    return null
  }
}

/**
 * Extract bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null

  const match = authHeader.match(/^Bearer (.+)$/)
  return match ? match[1] : null
}

/**
 * Authenticate request and return user or throw error
 */
export async function authenticateRequest(
  request: Request,
): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get("Authorization")
  const token = extractBearerToken(authHeader)

  if (!token) {
    return null
  }

  return await verifyToken(token)
}

/**
 * Require authentication or throw GraphQL error
 */
export async function requireAuth(
  request: Request,
): Promise<AuthenticatedUser> {
  const user = await authenticateRequest(request)

  if (!user) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHORIZED" },
    })
  }

  return user
}
