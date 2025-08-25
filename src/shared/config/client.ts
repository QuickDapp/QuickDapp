import env from "env-var"
import packageJson from "../../../package.json"

// Global type for injected config
declare global {
  var __CONFIG__: ClientConfig | undefined
}

// Client-safe configuration (can be exposed to frontend)
export interface ClientConfig {
  APP_NAME: string
  APP_VERSION: string
  NODE_ENV: "development" | "production" | "test"
  BASE_URL: string
  CHAIN: string
  CHAIN_RPC_ENDPOINT: string
  WALLETCONNECT_PROJECT_ID: string
  FACTORY_CONTRACT_ADDRESS: string
  SENTRY_DSN?: string
}

// Browser environment detection - check for DOM availability
const isBrowser = typeof document !== "undefined"

// Load client configuration (browser or server)
export const clientConfig: ClientConfig =
  isBrowser && globalThis.__CONFIG__
    ? globalThis.__CONFIG__
    : {
        APP_NAME: env.get("APP_NAME").default("QuickDapp").asString(),
        APP_VERSION: env
          .get("APP_VERSION")
          .default(packageJson.version)
          .asString(),
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
        FACTORY_CONTRACT_ADDRESS: env
          .get("FACTORY_CONTRACT_ADDRESS")
          .required()
          .asString(),
        SENTRY_DSN: env.get("SENTRY_DSN").asString(),
      }

// Validate critical client configuration on startup
export function validateClientConfig() {
  const requiredForClient = ["BASE_URL", "CHAIN_RPC_ENDPOINT"]

  const missing = requiredForClient.filter((key) => {
    const value = clientConfig[key as keyof ClientConfig]
    return !value || (typeof value === "string" && value.trim() === "")
  })

  if (missing.length > 0) {
    throw new Error(
      `Missing required client environment variables: ${missing.join(", ")}`,
    )
  }

  // Validate WALLETCONNECT_PROJECT_ID separately to allow placeholder values
  if (
    !clientConfig.WALLETCONNECT_PROJECT_ID ||
    clientConfig.WALLETCONNECT_PROJECT_ID.trim() === ""
  ) {
    throw new Error("WALLETCONNECT_PROJECT_ID is required")
  }
}
