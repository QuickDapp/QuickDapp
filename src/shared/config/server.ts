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

  // Security
  SESSION_ENCRYPTION_KEY: string
  SERVER_WALLET_PRIVATE_KEY: string
  ALLOWED_SIWE_ORIGINS: string[]

  // Per-chain RPC endpoints (server-only)
  SERVER_ANVIL_CHAIN_RPC?: string
  SERVER_MAINNET_CHAIN_RPC?: string
  SERVER_SEPOLIA_CHAIN_RPC?: string
  SERVER_BASE_CHAIN_RPC?: string

  // WebSocket configuration
  SOCKET_MAX_CONNECTIONS_PER_USER: number
  SOCKET_MAX_TOTAL_CONNECTIONS: number
  SOCKET_RATE_LIMIT_WINDOW_MS: number
  SOCKET_RATE_LIMIT_MAX_ENTRIES: number
  SOCKET_RATE_LIMIT_CLEANUP_THRESHOLD_MS: number
  SOCKET_RATE_LIMIT_CLEANUP_INTERVAL_MS: number

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

  // Security
  SESSION_ENCRYPTION_KEY: env
    .get("SESSION_ENCRYPTION_KEY")
    .required()
    .asString(),
  SERVER_WALLET_PRIVATE_KEY: env
    .get("SERVER_WALLET_PRIVATE_KEY")
    .required()
    .asString(),
  ALLOWED_SIWE_ORIGINS: env
    .get("ALLOWED_SIWE_ORIGINS")
    .required()
    .asString()
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0),

  // Per-chain RPC endpoints (server-only)
  SERVER_ANVIL_CHAIN_RPC: env.get("SERVER_ANVIL_CHAIN_RPC").asString(),
  SERVER_MAINNET_CHAIN_RPC: env.get("SERVER_MAINNET_CHAIN_RPC").asString(),
  SERVER_SEPOLIA_CHAIN_RPC: env.get("SERVER_SEPOLIA_CHAIN_RPC").asString(),
  SERVER_BASE_CHAIN_RPC: env.get("SERVER_BASE_CHAIN_RPC").asString(),

  // WebSocket configuration
  SOCKET_MAX_CONNECTIONS_PER_USER: env
    .get("SOCKET_MAX_CONNECTIONS_PER_USER")
    .default(5)
    .asInt(),
  SOCKET_MAX_TOTAL_CONNECTIONS: env
    .get("SOCKET_MAX_TOTAL_CONNECTIONS")
    .default(10000)
    .asInt(),
  SOCKET_RATE_LIMIT_WINDOW_MS: env
    .get("SOCKET_RATE_LIMIT_WINDOW_MS")
    .default(30000)
    .asInt(),
  SOCKET_RATE_LIMIT_MAX_ENTRIES: env
    .get("SOCKET_RATE_LIMIT_MAX_ENTRIES")
    .default(10000)
    .asInt(),
  SOCKET_RATE_LIMIT_CLEANUP_THRESHOLD_MS: env
    .get("SOCKET_RATE_LIMIT_CLEANUP_THRESHOLD_MS")
    .default(1800000)
    .asInt(),
  SOCKET_RATE_LIMIT_CLEANUP_INTERVAL_MS: env
    .get("SOCKET_RATE_LIMIT_CLEANUP_INTERVAL_MS")
    .default(300000)
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

  DIGITALOCEAN_ACCESS_TOKEN: env.get("DIGITALOCEAN_ACCESS_TOKEN").asString(),
}

// Validate critical configuration on startup
export function validateConfig() {
  const requiredForDev = [
    "DATABASE_URL",
    "SESSION_ENCRYPTION_KEY",
    "SERVER_WALLET_PRIVATE_KEY",
    "ALLOWED_SIWE_ORIGINS",
    "BASE_URL",
    "WALLETCONNECT_PROJECT_ID",
    "SUPPORTED_CHAINS",
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

// Get RPC endpoint for a specific chain
export function getChainRpcEndpoint(chainName: string): string | undefined {
  const normalizedName = chainName.toLowerCase()
  switch (normalizedName) {
    case "anvil":
      return serverConfig.SERVER_ANVIL_CHAIN_RPC
    case "mainnet":
    case "ethereum":
      return serverConfig.SERVER_MAINNET_CHAIN_RPC
    case "sepolia":
      return serverConfig.SERVER_SEPOLIA_CHAIN_RPC
    case "base":
      return serverConfig.SERVER_BASE_CHAIN_RPC
    default:
      return undefined
  }
}

// Get RPC endpoint for a specific chain, throwing if not configured
export function requireChainRpcEndpoint(chainName: string): string {
  const rpcUrl = getChainRpcEndpoint(chainName)
  if (!rpcUrl) {
    const envVarName = `SERVER_${chainName.toUpperCase()}_CHAIN_RPC`
    throw new Error(
      `RPC endpoint not configured for chain "${chainName}". ` +
        `Set the ${envVarName} environment variable.`,
    )
  }
  return rpcUrl
}

// Re-export client config and types for convenience
export { type ClientConfig, clientConfig } from "./client"
