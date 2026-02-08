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
  CLIENT_API_BASE_URL?: string
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
        CLIENT_API_BASE_URL: env.get("CLIENT_API_BASE_URL").asString(),
        SENTRY_DSN: env.get("SENTRY_DSN").asString(),
      }

// Validate critical client configuration on startup
export function validateClientConfig() {
  const requiredForClient: (keyof ClientConfig)[] = []

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

export function getClientApiBaseUrl(): string {
  if (clientConfig.CLIENT_API_BASE_URL) {
    return clientConfig.CLIENT_API_BASE_URL
  }
  return isBrowser ? window.location.origin : ""
}
