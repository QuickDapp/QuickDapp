/**
 * Time constants for use across client and server code
 */
export const ONE_SECOND = 1000
export const ONE_MINUTE = 60 * ONE_SECOND
export const THIRTY_MINUTES = 30 * ONE_MINUTE
export const ONE_HOUR = 60 * ONE_MINUTE

/**
 * Authentication method types
 */
export const AUTH_METHOD = {
  WALLET: "WALLET",
  EMAIL: "EMAIL",
} as const

export type AuthMethod = (typeof AUTH_METHOD)[keyof typeof AUTH_METHOD]

/**
 * Prefix for synthetic wallet addresses assigned to email users
 */
export const WEB2_WALLET_PREFIX = "web2-"

/**
 * Email verification settings
 */
export const EMAIL_VERIFICATION_CODE_EXPIRY_MS = ONE_HOUR
export const EMAIL_VERIFICATION_CODE_MIN = 100000
export const EMAIL_VERIFICATION_CODE_MAX = 999999
