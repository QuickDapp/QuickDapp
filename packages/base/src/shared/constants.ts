/**
 * Time constants for use across client and server code
 */
export const ONE_SECOND = 1000
export const ONE_MINUTE = 60 * ONE_SECOND
export const THIRTY_MINUTES = 30 * ONE_MINUTE
export const ONE_HOUR = 60 * ONE_MINUTE

/**
 * OAuth authentication methods
 */
export const OAUTH_METHOD = {
  GOOGLE: "GOOGLE",
  FACEBOOK: "FACEBOOK",
  GITHUB: "GITHUB",
  X: "X",
  TIKTOK: "TIKTOK",
  LINKEDIN: "LINKEDIN",
} as const

export type OAuthMethod = (typeof OAUTH_METHOD)[keyof typeof OAUTH_METHOD]

/**
 * All authentication method types
 */
export const AUTH_METHOD = {
  EMAIL: "EMAIL",
  ...OAUTH_METHOD,
} as const

export type AuthMethod = (typeof AUTH_METHOD)[keyof typeof AUTH_METHOD]

/**
 * Email verification settings
 */
export const EMAIL_VERIFICATION_CODE_EXPIRY_MS = ONE_HOUR
export const EMAIL_VERIFICATION_CODE_MIN = 100000
export const EMAIL_VERIFICATION_CODE_MAX = 999999
