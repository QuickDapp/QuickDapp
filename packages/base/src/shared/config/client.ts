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
      }

// Validate critical client configuration on startup
export function validateClientConfig() {
  const requiredForClient = ["API_URL"]

  const missing = requiredForClient.filter((key) => {
    const value = clientConfig[key as keyof ClientConfig]
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
