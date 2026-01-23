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
  API_URL: string
  SENTRY_DSN?: string
  // Web3 configuration (always required in this variant)
  WEB3_WALLETCONNECT_PROJECT_ID: string
  WEB3_FACTORY_CONTRACT_ADDRESS: string
  WEB3_SUPPORTED_CHAINS: string[]
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
        API_URL: env.get("API_URL").required().asString(),
        SENTRY_DSN: env.get("SENTRY_DSN").asString(),
        WEB3_WALLETCONNECT_PROJECT_ID: env
          .get("WEB3_WALLETCONNECT_PROJECT_ID")
          .required()
          .asString(),
        WEB3_FACTORY_CONTRACT_ADDRESS: env
          .get("WEB3_FACTORY_CONTRACT_ADDRESS")
          .required()
          .asString(),
        WEB3_SUPPORTED_CHAINS: env
          .get("WEB3_SUPPORTED_CHAINS")
          .required()
          .asString()
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
      }

// Validate critical client configuration on startup
export function validateClientConfig() {
  const requiredForClient: (keyof ClientConfig)[] = [
    "API_URL",
    "WEB3_WALLETCONNECT_PROJECT_ID",
    "WEB3_FACTORY_CONTRACT_ADDRESS",
    "WEB3_SUPPORTED_CHAINS",
  ]

  const missing = requiredForClient.filter((key) => {
    const value = clientConfig[key]
    if (Array.isArray(value)) {
      return value.length === 0
    }
    return !value || (typeof value === "string" && value.trim() === "")
  })

  if (missing.length > 0) {
    throw new Error(
      `Missing required client environment variables: ${missing.join(", ")}`,
    )
  }
}
