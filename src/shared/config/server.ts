import env from "env-var"
import { type ClientConfig, clientConfig } from "./client"

// Server-only configuration (extends client config)
export interface ServerConfig extends ClientConfig {
  // Server settings
  WEB_ENABLED: boolean
  HOST: string
  PORT: number
  WORKER_COUNT: number | "cpus"
  STATIC_ASSETS_FOLDER?: string

  // Logging
  LOG_LEVEL: "trace" | "debug" | "info" | "warn" | "error"
  WORKER_LOG_LEVEL: "trace" | "debug" | "info" | "warn" | "error"

  // Database
  DATABASE_URL: string
  TX_BLOCK_CONFIRMATIONS_REQUIRED: number

  // Security
  SESSION_ENCRYPTION_KEY: string
  SERVER_WALLET_PRIVATE_KEY: string

  // Blockchain (server-side)
  SERVER_CHAIN_RPC_ENDPOINT: string

  // External services (optional)
  MAILGUN_API_KEY?: string
  MAILGUN_API_ENDPOINT?: string
  MAILGUN_FROM_ADDRESS?: string

  // Sentry configuration
  SENTRY_DSN?: string
  SENTRY_WORKER_DSN?: string
  SENTRY_TRACES_SAMPLE_RATE: number
  SENTRY_PROFILE_SESSION_SAMPLE_RATE: number

  DIGITALOCEAN_ACCESS_TOKEN?: string
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
  TX_BLOCK_CONFIRMATIONS_REQUIRED: env
    .get("TX_BLOCK_CONFIRMATIONS_REQUIRED")
    .default(1)
    .asInt(),

  // Security
  SESSION_ENCRYPTION_KEY: env
    .get("SESSION_ENCRYPTION_KEY")
    .required()
    .asString(),
  SERVER_WALLET_PRIVATE_KEY: env
    .get("SERVER_WALLET_PRIVATE_KEY")
    .required()
    .asString(),

  // Blockchain (server-side)
  SERVER_CHAIN_RPC_ENDPOINT: env
    .get("SERVER_CHAIN_RPC_ENDPOINT")
    .required()
    .asString(),

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

  DIGITALOCEAN_ACCESS_TOKEN: env.get("DIGITALOCEAN_ACCESS_TOKEN").asString(),
}

// Validate critical configuration on startup
export function validateConfig() {
  const requiredForDev = [
    "DATABASE_URL",
    "SESSION_ENCRYPTION_KEY",
    "SERVER_WALLET_PRIVATE_KEY",
    "BASE_URL",
    "CHAIN_RPC_ENDPOINT",
    "SERVER_CHAIN_RPC_ENDPOINT",
    "WALLETCONNECT_PROJECT_ID",
  ]

  const missing = requiredForDev.filter((key) => {
    const value = process.env[key]
    return !value || value.trim() === ""
  })

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    )
  }

  // Validate session key length (should be 32+ characters for security)
  if (serverConfig.SESSION_ENCRYPTION_KEY.length < 32) {
    throw new Error(
      "SESSION_ENCRYPTION_KEY must be at least 32 characters long",
    )
  }
}

// Re-export client config and types for convenience
export { type ClientConfig, clientConfig } from "./client"
