import env from "env-var"
import packageJson from "../../../package.json"

declare global {
  var __CONFIG__: ClientConfig | undefined
}

export interface ClientConfig {
  APP_NAME: string
  APP_VERSION: string
  NODE_ENV: "development" | "production" | "test"
  SENTRY_DSN?: string
  SENTRY_TRACES_SAMPLE_RATE: number
  SENTRY_REPLAY_SESSION_SAMPLE_RATE: number
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
        SENTRY_DSN: env.get("SENTRY_DSN").asString(),
        SENTRY_TRACES_SAMPLE_RATE: env
          .get("SENTRY_TRACES_SAMPLE_RATE")
          .default("1.0")
          .asFloat(),
        SENTRY_REPLAY_SESSION_SAMPLE_RATE: env
          .get("SENTRY_REPLAY_SESSION_SAMPLE_RATE")
          .default("1.0")
          .asFloat(),
      }

export function validateClientConfig() {
  const requiredForClient: (keyof ClientConfig)[] = []

  const missing = requiredForClient.filter((key) => {
    const value = clientConfig[key]
    return !value || (typeof value === "string" && value.trim() === "")
  })

  if (missing.length > 0) {
    throw new Error(
      `Missing required client environment variables: ${missing.join(", ")}`,
    )
  }
}
