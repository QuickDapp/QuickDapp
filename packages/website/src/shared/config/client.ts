import env from "env-var"
import packageJson from "../../../package.json"

declare global {
  var __CONFIG__: ClientConfig | undefined
}

export interface ClientConfig {
  APP_NAME: string
  APP_VERSION: string
  NODE_ENV: "development" | "production" | "test"
  API_URL: string
  SENTRY_DSN?: string
}

const isBrowser = typeof document !== "undefined"

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
        API_URL: env.get("API_URL").default("http://localhost:3000").asString(),
        SENTRY_DSN: env.get("SENTRY_DSN").asString(),
      }

export function validateClientConfig() {
  const requiredForClient = ["API_URL"]

  const missing = requiredForClient.filter((key) => {
    const value = clientConfig[key as keyof ClientConfig]
    return !value || (typeof value === "string" && value.trim() === "")
  })

  if (missing.length > 0) {
    throw new Error(
      `Missing required client environment variables: ${missing.join(", ")}`,
    )
  }
}
