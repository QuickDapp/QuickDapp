import env from "env-var"
import { type ClientConfig, clientConfig } from "./client"

// Server-only configuration (extends client config)
export interface ServerConfig extends ClientConfig {
  // Server settings
  WEB_ENABLED: boolean
  HOST: string
  PORT: number
  WORKER_COUNT: number | "cpus"
  WORKER_ID?: string
  STATIC_ASSETS_FOLDER?: string

  // Logging
  LOG_LEVEL: "trace" | "debug" | "info" | "warn" | "error"
  WORKER_LOG_LEVEL: "trace" | "debug" | "info" | "warn" | "error"

  // Database
  DATABASE_URL: string

  // Security
  SESSION_ENCRYPTION_KEY: string

  // OAuth configuration (optional)
  OAUTH_GOOGLE_CLIENT_ID?: string
  OAUTH_GOOGLE_CLIENT_SECRET?: string
  OAUTH_FACEBOOK_CLIENT_ID?: string
  OAUTH_FACEBOOK_CLIENT_SECRET?: string
  OAUTH_GITHUB_CLIENT_ID?: string
  OAUTH_GITHUB_CLIENT_SECRET?: string
  OAUTH_X_CLIENT_ID?: string
  OAUTH_X_CLIENT_SECRET?: string
  OAUTH_TIKTOK_CLIENT_KEY?: string
  OAUTH_TIKTOK_CLIENT_SECRET?: string
  OAUTH_LINKEDIN_CLIENT_ID?: string
  OAUTH_LINKEDIN_CLIENT_SECRET?: string
  OAUTH_CALLBACK_BASE_URL?: string

  // WebSocket configuration
  SOCKET_MAX_CONNECTIONS_PER_USER: number
  SOCKET_MAX_TOTAL_CONNECTIONS: number

  // External services (optional)
  MAILGUN_API_KEY?: string
  MAILGUN_API_ENDPOINT?: string
  MAILGUN_FROM_ADDRESS?: string

  // Sentry configuration
  SENTRY_DSN?: string
  SENTRY_WORKER_DSN?: string
  SENTRY_TRACES_SAMPLE_RATE: number
  SENTRY_PROFILE_SESSION_SAMPLE_RATE: number
}

// Load and validate server configuration
export const serverConfig: ServerConfig = {
  ...clientConfig,

  // Server settings
  WEB_ENABLED: env.get("WEB_ENABLED").default("true").asBool(),
  HOST: env.get("HOST").default("localhost").asString(),
  PORT: env.get("PORT").default(3000).asPortNumber(),
  WORKER_COUNT:
    env.get("WORKER_COUNT").default("1").asString() === "cpus"
      ? "cpus"
      : env.get("WORKER_COUNT").default(1).asInt(),
  WORKER_ID: env.get("WORKER_ID").asString(),
  STATIC_ASSETS_FOLDER: env.get("STATIC_ASSETS_FOLDER").asString(),

  // Logging
  LOG_LEVEL: env
    .get("LOG_LEVEL")
    .default("info")
    .asEnum(["trace", "debug", "info", "warn", "error"]),
  WORKER_LOG_LEVEL: env
    .get("WORKER_LOG_LEVEL")
    .default("info")
    .asEnum(["trace", "debug", "info", "warn", "error"]),

  // Database
  DATABASE_URL: env.get("DATABASE_URL").required().asString(),

  // Security
  SESSION_ENCRYPTION_KEY: env
    .get("SESSION_ENCRYPTION_KEY")
    .required()
    .asString(),

  // OAuth configuration
  OAUTH_GOOGLE_CLIENT_ID: env.get("OAUTH_GOOGLE_CLIENT_ID").asString(),
  OAUTH_GOOGLE_CLIENT_SECRET: env.get("OAUTH_GOOGLE_CLIENT_SECRET").asString(),
  OAUTH_FACEBOOK_CLIENT_ID: env.get("OAUTH_FACEBOOK_CLIENT_ID").asString(),
  OAUTH_FACEBOOK_CLIENT_SECRET: env
    .get("OAUTH_FACEBOOK_CLIENT_SECRET")
    .asString(),
  OAUTH_GITHUB_CLIENT_ID: env.get("OAUTH_GITHUB_CLIENT_ID").asString(),
  OAUTH_GITHUB_CLIENT_SECRET: env.get("OAUTH_GITHUB_CLIENT_SECRET").asString(),
  OAUTH_X_CLIENT_ID: env.get("OAUTH_X_CLIENT_ID").asString(),
  OAUTH_X_CLIENT_SECRET: env.get("OAUTH_X_CLIENT_SECRET").asString(),
  OAUTH_TIKTOK_CLIENT_KEY: env.get("OAUTH_TIKTOK_CLIENT_KEY").asString(),
  OAUTH_TIKTOK_CLIENT_SECRET: env.get("OAUTH_TIKTOK_CLIENT_SECRET").asString(),
  OAUTH_LINKEDIN_CLIENT_ID: env.get("OAUTH_LINKEDIN_CLIENT_ID").asString(),
  OAUTH_LINKEDIN_CLIENT_SECRET: env
    .get("OAUTH_LINKEDIN_CLIENT_SECRET")
    .asString(),
  OAUTH_CALLBACK_BASE_URL: env.get("OAUTH_CALLBACK_BASE_URL").asString(),

  // WebSocket configuration
  SOCKET_MAX_CONNECTIONS_PER_USER: env
    .get("SOCKET_MAX_CONNECTIONS_PER_USER")
    .default(5)
    .asInt(),
  SOCKET_MAX_TOTAL_CONNECTIONS: env
    .get("SOCKET_MAX_TOTAL_CONNECTIONS")
    .default(10000)
    .asInt(),

  // External services (optional)
  MAILGUN_API_KEY: env.get("MAILGUN_API_KEY").asString(),
  MAILGUN_API_ENDPOINT: env.get("MAILGUN_API_ENDPOINT").asString(),
  MAILGUN_FROM_ADDRESS: env.get("MAILGUN_FROM_ADDRESS").asString(),

  // Sentry configuration
  SENTRY_DSN: env.get("SENTRY_DSN").asString(),
  SENTRY_WORKER_DSN: env.get("SENTRY_WORKER_DSN").asString(),
  SENTRY_TRACES_SAMPLE_RATE: env
    .get("SENTRY_TRACES_SAMPLE_RATE")
    .default("1.0")
    .asFloat(),
  SENTRY_PROFILE_SESSION_SAMPLE_RATE: env
    .get("SENTRY_PROFILE_SESSION_SAMPLE_RATE")
    .default("1.0")
    .asFloat(),
}

// Helper to check if a config value is empty
function isConfigValueEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === "string") return value.trim() === ""
  if (Array.isArray(value)) return value.length === 0
  return false
}

// Validate critical configuration on startup
export function validateConfig() {
  const requiredForAll: (keyof ServerConfig)[] = [
    "DATABASE_URL",
    "SESSION_ENCRYPTION_KEY",
    "API_URL",
  ]

  const missing = requiredForAll.filter((key) =>
    isConfigValueEmpty(serverConfig[key]),
  )

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    )
  }

  // Validate session key length
  if (serverConfig.SESSION_ENCRYPTION_KEY.length < 32) {
    throw new Error(
      "SESSION_ENCRYPTION_KEY must be at least 32 characters long",
    )
  }
}

// Re-export client config and types for convenience
export { type ClientConfig, clientConfig } from "./client"
