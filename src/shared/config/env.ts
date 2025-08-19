import env from "env-var"
import packageJson from "../../../package.json"

// Client-safe configuration (can be exposed to frontend)
export interface ClientConfig {
  APP_NAME: string
  APP_VERSION: string
  NODE_ENV: "development" | "production" | "test"
  BASE_URL: string
  CHAIN: string
  CHAIN_RPC_ENDPOINT: string
  WALLETCONNECT_PROJECT_ID: string
  DIAMOND_PROXY_ADDRESS: string
  SENTRY_DSN?: string
}

// Server-only configuration (extends client config)
export interface ServerConfig extends ClientConfig {
  // Server settings
  WEB_ENABLED: boolean
  HOST: string
  PORT: number
  WORKER_COUNT: number | "cpus"

  // Logging
  LOG_LEVEL: "trace" | "debug" | "info" | "warn" | "error"
  WORKER_LOG_LEVEL: "trace" | "debug" | "info" | "warn" | "error"

  // Database
  DATABASE_URL: string
  TX_BLOCK_CONFIRMATIONS_REQUIRED: number

  // Security
  SESSION_ENCRYPTION_KEY: string
  SERVER_WALLET_PRIVATE_KEY: string

  // External services (optional)
  MAILGUN_API_KEY?: string
  MAILGUN_API_ENDPOINT?: string
  MAILGUN_FROM_ADDRESS?: string
  SENTRY_WORKER_DSN?: string
  SENTRY_AUTH_TOKEN?: string
  DIGITALOCEAN_ACCESS_TOKEN?: string
}

// Load and validate client configuration
export const clientConfig: ClientConfig = {
  APP_NAME: env.get("APP_NAME").default("QuickDapp").asString(),
  APP_VERSION: env.get("APP_VERSION").default(packageJson.version).asString(),
  NODE_ENV: env
    .get("NODE_ENV")
    .default("development")
    .asEnum(["development", "production", "test"]),
  BASE_URL: env.get("BASE_URL").required().asString(),
  CHAIN: env.get("CHAIN").required().asString(),
  CHAIN_RPC_ENDPOINT: env.get("CHAIN_RPC_ENDPOINT").required().asString(),
  WALLETCONNECT_PROJECT_ID: env
    .get("WALLETCONNECT_PROJECT_ID")
    .required()
    .asString(),
  DIAMOND_PROXY_ADDRESS: env.get("DIAMOND_PROXY_ADDRESS").required().asString(),
  SENTRY_DSN: env.get("SENTRY_DSN").asString(),
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

  // External services (optional)
  MAILGUN_API_KEY: env.get("MAILGUN_API_KEY").asString(),
  MAILGUN_API_ENDPOINT: env.get("MAILGUN_API_ENDPOINT").asString(),
  MAILGUN_FROM_ADDRESS: env.get("MAILGUN_FROM_ADDRESS").asString(),
  SENTRY_WORKER_DSN: env.get("SENTRY_WORKER_DSN").asString(),
  SENTRY_AUTH_TOKEN: env.get("SENTRY_AUTH_TOKEN").asString(),
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
