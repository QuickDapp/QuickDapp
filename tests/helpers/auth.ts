/**
 * Auth test helpers for QuickDapp v3
 *
 * Utilities for testing authentication using viem for wallet operations,
 * SIWE for sign-in with Ethereum, and jose for JWT token management.
 */

import { jwtVerify, SignJWT } from "jose"
import { SiweMessage } from "siwe"
import { getAddress, isAddress } from "viem"
import {
  generatePrivateKey,
  type PrivateKeyAccount,
  privateKeyToAccount,
} from "viem/accounts"
import { AuthService } from "../../src/server/auth"
import { createRootLogger } from "../../src/server/lib/logger"
import type { ServerApp } from "../../src/server/types"

export interface TestWallet {
  address: string
  privateKey: `0x${string}`
  account: PrivateKeyAccount
}

export interface AuthenticatedTestUser {
  wallet: TestWallet
  token: string
  siweMessage: SiweMessage
  signature: string
}

/**
 * Generate a random test wallet using viem
 */
export function generateTestWallet(): TestWallet {
  const privateKey = generatePrivateKey()
  const account = privateKeyToAccount(privateKey)

  return {
    address: getAddress(account.address), // Checksummed address
    privateKey,
    account,
  }
}

/**
 * Create wallet from existing private key
 */
export function createWalletFromPrivateKey(
  privateKey: `0x${string}`,
): TestWallet {
  const account = privateKeyToAccount(privateKey)

  return {
    address: getAddress(account.address),
    privateKey,
    account,
  }
}

/**
 * Generate a random nonce for SIWE messages
 */
export function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15)
}

/**
 * Create a SIWE message for testing
 */
export function createSIWEMessage(
  address: string,
  options: {
    domain?: string
    uri?: string
    statement?: string
    version?: string
    chainId?: number
    nonce?: string
    issuedAt?: string
    expirationTime?: string
    notBefore?: string
    requestId?: string
    resources?: string[]
  } = {},
): SiweMessage {
  const {
    domain = "example.com",
    uri = "http://example.com:3002",
    statement = "Sign in to QuickDapp",
    version = "1",
    chainId = 1,
    nonce = generateNonce(),
    issuedAt = new Date().toISOString(),
    expirationTime,
    notBefore,
    requestId,
    resources,
  } = options

  return new SiweMessage({
    domain,
    address: getAddress(address), // Ensure checksummed
    statement,
    uri,
    version,
    chainId,
    nonce,
    issuedAt,
    expirationTime,
    notBefore,
    requestId,
    resources,
  })
}

/**
 * Sign a SIWE message with a wallet
 */
export async function signSIWEMessage(
  message: SiweMessage,
  privateKey: `0x${string}`,
): Promise<string> {
  const account = privateKeyToAccount(privateKey)
  return await account.signMessage({
    message: message.prepareMessage(),
  })
}

/**
 * Get the correct JWT secret for the current environment
 */
function getJWTSecret(): string {
  // In test environment, always use the test key
  if (process.env.NODE_ENV === "test") {
    return "test_key_32_chars_long_for_testing_only!!"
  }

  // Otherwise use the actual server key
  return (
    process.env.SESSION_ENCRYPTION_KEY ||
    "test_key_32_chars_long_for_testing_only!!"
  )
}

/**
 * Create a test JWT token
 */
export async function createTestJWT(
  wallet: string,
  options: {
    expiresIn?: string
    secret?: string
    extraClaims?: Record<string, any>
  } = {},
): Promise<string> {
  const {
    expiresIn = "1h",
    secret = getJWTSecret(),
    extraClaims = {},
  } = options

  console.log(`[TEST DEBUG] Creating JWT with secret: ${secret}`)
  console.log(`[TEST DEBUG] NODE_ENV: ${process.env.NODE_ENV}`)
  console.log(`[TEST DEBUG] Wallet: ${wallet}`)

  const jwtSecret = new TextEncoder().encode(secret)

  return await new SignJWT({
    wallet: wallet.toLowerCase(),
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
export async function createExpiredJWT(wallet: string): Promise<string> {
  return await createTestJWT(wallet, {
    expiresIn: "-1h", // Already expired
  })
}

/**
 * Create various malformed JWT tokens for testing
 */
export async function createMalformedJWT(
  type:
    | "invalid-signature"
    | "wrong-secret"
    | "missing-wallet"
    | "invalid-format",
): Promise<string> {
  switch (type) {
    case "invalid-signature": {
      const validToken = await createTestJWT(
        "0x1234567890123456789012345678901234567890",
      )
      // Corrupt the signature part
      const parts = validToken.split(".")
      const corruptedSignature = parts[2].replace(/[a-zA-Z]/, "X")
      return `${parts[0]}.${parts[1]}.${corruptedSignature}`
    }

    case "wrong-secret":
      return await createTestJWT("0x1234567890123456789012345678901234567890", {
        secret: "wrong_secret_key_for_testing_purposes!!",
      })

    case "missing-wallet":
      return await createTestJWT("0x1234567890123456789012345678901234567890", {
        extraClaims: { wallet: undefined },
      })

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
 * Create a simple authenticated test user with direct JWT creation (for faster tests)
 */
export async function createSimpleAuthenticatedTestUser(): Promise<{
  wallet: TestWallet
  token: string
}> {
  const wallet = generateTestWallet()
  const token = await createTestJWT(wallet.address)

  return {
    wallet,
    token,
  }
}

/**
 * Create a mock ServerApp for testing auth functions
 */
function createMockServerApp(): ServerApp {
  const rootLogger = createRootLogger()
  return {
    app: {} as any,
    db: {} as any,
    rootLogger,
    createLogger: (category: string) => rootLogger.child(category),
    workerManager: {} as any,
  }
}

/**
 * Create a fully authenticated test user with real SIWE flow
 */
export async function createAuthenticatedTestUser(
  options: { domain?: string; chainId?: number; expirationTime?: string } = {},
): Promise<AuthenticatedTestUser> {
  // Generate test wallet
  const wallet = generateTestWallet()

  // Create SIWE message
  const siweMessage = createSIWEMessage(wallet.address, options)

  // Sign the message
  const signature = await signSIWEMessage(siweMessage, wallet.privateKey)

  // Create mock ServerApp and AuthService
  const mockServerApp = createMockServerApp()
  const authService = new AuthService(mockServerApp)

  // Authenticate through the real auth system to get JWT
  const { token } = await authService.authenticateWithSiwe(
    siweMessage.prepareMessage(),
    signature,
  )

  return {
    wallet,
    token,
    siweMessage,
    signature,
  }
}

/**
 * Create multiple test users for testing scenarios
 */
export async function createMultipleTestUsers(
  count: number,
): Promise<AuthenticatedTestUser[]> {
  const users: AuthenticatedTestUser[] = []

  for (let i = 0; i < count; i++) {
    const user = await createAuthenticatedTestUser()
    users.push(user)
  }

  return users
}

/**
 * Validate if a string is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return isAddress(address)
}

/**
 * Get checksummed version of an address
 */
export function checksumAddress(address: string): string {
  return getAddress(address)
}

/**
 * Create test data for different wallet scenarios
 */
export const TEST_WALLETS = {
  // Well-known test private keys (never use in production)
  hardhat: {
    privateKey:
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  anvil: {
    privateKey:
      "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
    address: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
  },
} as const

/**
 * Get a predefined test wallet
 */
export function getPredefinedTestWallet(
  name: keyof typeof TEST_WALLETS,
): TestWallet {
  const walletData = TEST_WALLETS[name]
  return createWalletFromPrivateKey(walletData.privateKey as `0x${string}`)
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
