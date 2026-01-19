/**
 * Auth test helpers for QuickDapp Base
 *
 * Utilities for testing authentication using email/OAuth and JWT token management.
 * Note: This is the base package - no Web3/SIWE authentication.
 */

// Side-effect import: sets env vars before serverConfig loads
import "./test-config"

import { generateCodeVerifier } from "arctic"
import { jwtVerify, SignJWT } from "jose"
import type { OAuthProvider } from "../../src/server/auth/oauth"
import { encryptOAuthState } from "../../src/server/auth/oauth-state"
import { createEmailUserIfNotExists } from "../../src/server/db/users"
import { generateVerificationCodeAndBlob } from "../../src/server/lib/emailVerification"
import type { ServerApp } from "../../src/server/types"
import { serverConfig } from "../../src/shared/config/server"
import type { NotificationData } from "../../src/shared/notifications/types"
import { testLogger } from "./logger"

export interface AuthenticatedTestUser {
  email: string
  token: string
  userId: number
}

/**
 * Get the correct JWT secret for the current environment
 * This must match exactly what AuthService uses in src/server/auth/index.ts
 */
function getJWTSecret(): string {
  return serverConfig.SESSION_ENCRYPTION_KEY
}

/**
 * Create a test JWT token
 */
export async function createTestJWT(
  options: {
    userId?: number
    expiresIn?: string
    secret?: string
    extraClaims?: Record<string, any>
  } = {},
): Promise<string> {
  const {
    userId = 1,
    expiresIn = "1h",
    secret = getJWTSecret(),
    extraClaims = {},
  } = options

  testLogger.debug(`Creating JWT for userId: ${userId}`)
  testLogger.debug(`Using expiresIn: ${expiresIn}`)

  const jwtSecret = new TextEncoder().encode(secret)

  return await new SignJWT({
    type: "auth",
    userId,
    iat: Math.floor(Date.now() / 1000),
    ...extraClaims,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .sign(jwtSecret)
}

/**
 * Create an expired JWT token
 */
export async function createExpiredJWT(): Promise<string> {
  return await createTestJWT({
    expiresIn: "-1h",
  })
}

/**
 * Create various malformed JWT tokens for testing
 */
export async function createMalformedJWT(
  type:
    | "invalid-signature"
    | "wrong-secret"
    | "missing-userId"
    | "invalid-format",
): Promise<string> {
  switch (type) {
    case "invalid-signature": {
      const validToken = await createTestJWT()
      const parts = validToken.split(".")
      const signature = parts[2]
      if (!signature) throw new Error("Invalid token format")

      let corruptedSignature = signature
        .replace(/[a-z]/g, "X")
        .replace(/[A-Z]/g, "Y")
        .replace(/[0-9]/g, "9")
        .replace(/-/g, "_")
        .replace(/_/g, "-")

      if (corruptedSignature === signature) {
        corruptedSignature = "INVALID_SIGNATURE_" + signature.slice(16)
      }

      return `${parts[0]}.${parts[1]}.${corruptedSignature}`
    }

    case "wrong-secret":
      return await createTestJWT({
        secret: "completely_different_secret_that_will_fail_validation_32chars",
      })

    case "missing-userId": {
      const jwtSecret = new TextEncoder().encode(getJWTSecret())
      return await new SignJWT({
        type: "auth",
        iat: Math.floor(Date.now() / 1000),
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .sign(jwtSecret)
    }

    case "invalid-format":
      return "not.a.valid.jwt.token"

    default:
      throw new Error(`Unknown malformed JWT type: ${type}`)
  }
}

/**
 * Decode a JWT token for inspection (without verification)
 */
export function decodeJWT(token: string): any {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format")
    }

    const payload = parts[1]
    if (!payload) throw new Error("Invalid JWT payload")
    const decoded = Buffer.from(payload, "base64url").toString("utf-8")
    return JSON.parse(decoded)
  } catch (error) {
    throw new Error(`Failed to decode JWT: ${error}`)
  }
}

/**
 * Create an Authorization header with Bearer token
 */
export function createAuthHeader(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
  }
}

/**
 * Generate a random test email address
 */
export function generateTestEmail(): string {
  const random = Math.random().toString(36).substring(2, 10)
  return `test-${random}@example.com`
}

/**
 * Email authentication test helpers
 */
export interface EmailAuthTestData {
  email: string
  code: string
  blob: string
}

/**
 * Generate email verification code and blob for testing
 */
export async function generateTestEmailVerification(
  email: string,
): Promise<EmailAuthTestData> {
  const { code, blob } = await generateVerificationCodeAndBlob(
    testLogger,
    email,
  )
  return { email, code, blob }
}

/**
 * Create a mock ServerApp for testing auth functions
 */
function createMockServerApp(): ServerApp {
  return {
    app: {} as any,
    db: {} as any,
    rootLogger: testLogger,
    createLogger: (category: string) => testLogger.child(category),
    startSpan: (() => {
      /* no-op */
    }) as any,
    workerManager: {} as any,
    socketManager: {} as any,
    createNotification: async (
      _userId: number,
      _notificationData: NotificationData,
    ) => {
      /* no-op */
    },
  }
}

/**
 * Create an authenticated test user via email auth
 */
export async function createAuthenticatedTestUser(
  options: { serverApp?: ServerApp; email?: string } = {},
): Promise<AuthenticatedTestUser> {
  const serverApp = options.serverApp || createMockServerApp()
  const testEmail = options.email || generateTestEmail()

  // Create user in database
  const user = await createEmailUserIfNotExists(serverApp.db, testEmail)

  // Create JWT token
  const token = await createTestJWT({
    userId: user.id,
  })

  return {
    email: testEmail,
    token,
    userId: user.id,
  }
}

/**
 * Create multiple test users for testing scenarios
 */
export async function createMultipleTestUsers(
  count: number,
  options: {
    serverApp?: ServerApp
  } = {},
): Promise<AuthenticatedTestUser[]> {
  const users: AuthenticatedTestUser[] = []

  for (let i = 0; i < count; i++) {
    const user = await createAuthenticatedTestUser(options)
    users.push(user)
  }

  return users
}

/**
 * Verify a JWT token (for testing token validation)
 */
export async function verifyTestJWT(
  token: string,
  secret: string = getJWTSecret(),
): Promise<any> {
  const jwtSecret = new TextEncoder().encode(secret)
  const { payload } = await jwtVerify(token, jwtSecret)
  return payload
}

/**
 * Create GraphQL request helpers with authentication
 */
export function createGraphQLRequest(
  query: string,
  variables?: Record<string, any>,
  authToken?: string,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`
  }

  return {
    method: "POST",
    headers,
    body: JSON.stringify({
      query,
      variables,
    }),
  }
}

/**
 * Wait for a promise with timeout (useful for testing)
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ])
}

/**
 * OAuth test helpers
 */
export interface MockOAuthState {
  encryptedState: string
  codeVerifier?: string
  provider: OAuthProvider
}

/**
 * Create mock OAuth state for testing (uses encrypted state)
 */
export async function createMockOAuthState(
  provider: OAuthProvider,
  includeCodeVerifier = true,
  redirectUrl?: string,
): Promise<MockOAuthState> {
  const codeVerifier = includeCodeVerifier ? generateCodeVerifier() : undefined
  const encryptedState = await encryptOAuthState(
    provider,
    codeVerifier,
    redirectUrl,
  )
  return {
    encryptedState,
    codeVerifier,
    provider,
  }
}

/**
 * Mock OAuth user info for different providers
 */
export interface MockOAuthUserInfo {
  id: string
  email?: string
  name?: string
}

export function createMockOAuthUserInfo(
  provider: OAuthProvider,
  overrides: Partial<MockOAuthUserInfo> = {},
): MockOAuthUserInfo {
  const baseInfo: MockOAuthUserInfo = {
    id: `mock-${provider.toLowerCase()}-user-${Math.random().toString(36).substring(2, 10)}`,
    name: `Mock ${provider} User`,
  }

  if (["GOOGLE", "FACEBOOK", "GITHUB", "LINKEDIN"].includes(provider)) {
    baseInfo.email = `mock-${provider.toLowerCase()}-${Math.random().toString(36).substring(2, 10)}@example.com`
  }

  return { ...baseInfo, ...overrides }
}

/**
 * Create a GraphQL request for OAuth login URL
 */
export function createOAuthLoginUrlRequest(
  provider: OAuthProvider,
  authToken?: string,
  redirectUrl?: string,
) {
  return createGraphQLRequest(
    `
    mutation GetOAuthLoginUrl($provider: OAuthProvider!, $redirectUrl: String) {
      getOAuthLoginUrl(provider: $provider, redirectUrl: $redirectUrl) {
        success
        url
        provider
        error
      }
    }
  `,
    { provider, redirectUrl },
    authToken,
  )
}
