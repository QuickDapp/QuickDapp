import env from "env-var"
import { type ClientConfig, clientConfig } from "./client"

export interface ServerConfig extends ClientConfig {
  BASE_URL: string
  WEB_ENABLED: boolean
  HOST: string
  PORT: number
  WORKER_COUNT: number | "cpus"
  WORKER_ID?: string
  STATIC_ASSETS_FOLDER?: string

  LOG_LEVEL: "trace" | "debug" | "info" | "warn" | "error"
  WORKER_LOG_LEVEL: "trace" | "debug" | "info" | "warn" | "error"

  DATABASE_URL: string
  SESSION_ENCRYPTION_KEY: string

  GITHUB_AUTH_TOKEN?: string

  SOCKET_MAX_CONNECTIONS_PER_USER: number
  SOCKET_MAX_TOTAL_CONNECTIONS: number

  MAILGUN_API_KEY?: string
  MAILGUN_API_ENDPOINT?: string
  MAILGUN_FROM_ADDRESS?: string
  MAILGUN_REPLY_TO?: string

  SENTRY_WORKER_DSN?: string
  SENTRY_PROFILE_SESSION_SAMPLE_RATE: number
}

export const serverConfig: ServerConfig = {
  ...clientConfig,

  BASE_URL: env.get("BASE_URL").required().asString(),
  WEB_ENABLED: env.get("WEB_ENABLED").default("true").asBool(),
  HOST: env.get("HOST").default("localhost").asString(),
  PORT: env.get("PORT").default(3000).asPortNumber(),
  WORKER_COUNT:
    env.get("WORKER_COUNT").default("1").asString() === "cpus"
      ? "cpus"
      : env.get("WORKER_COUNT").default(1).asInt(),
  WORKER_ID: env.get("WORKER_ID").asString(),
  STATIC_ASSETS_FOLDER: env.get("STATIC_ASSETS_FOLDER").asString(),

  LOG_LEVEL: env
    .get("LOG_LEVEL")
    .default("info")
    .asEnum(["trace", "debug", "info", "warn", "error"]),
  WORKER_LOG_LEVEL: env
    .get("WORKER_LOG_LEVEL")
    .default("info")
    .asEnum(["trace", "debug", "info", "warn", "error"]),

  DATABASE_URL: env.get("DATABASE_URL").required().asString(),
  SESSION_ENCRYPTION_KEY: env
    .get("SESSION_ENCRYPTION_KEY")
    .required()
    .asString(),

  GITHUB_AUTH_TOKEN: env.get("GITHUB_AUTH_TOKEN").asString(),

  SOCKET_MAX_CONNECTIONS_PER_USER: env
    .get("SOCKET_MAX_CONNECTIONS_PER_USER")
    .default(5)
    .asInt(),
  SOCKET_MAX_TOTAL_CONNECTIONS: env
    .get("SOCKET_MAX_TOTAL_CONNECTIONS")
    .default(10000)
    .asInt(),

  MAILGUN_API_KEY: env.get("MAILGUN_API_KEY").asString(),
  MAILGUN_API_ENDPOINT: env.get("MAILGUN_API_ENDPOINT").asString(),
  MAILGUN_FROM_ADDRESS: env.get("MAILGUN_FROM_ADDRESS").asString(),
  MAILGUN_REPLY_TO: env.get("MAILGUN_REPLY_TO").asString(),

  SENTRY_WORKER_DSN: env.get("SENTRY_WORKER_DSN").asString(),
  SENTRY_PROFILE_SESSION_SAMPLE_RATE: env
    .get("SENTRY_PROFILE_SESSION_SAMPLE_RATE")
    .default("1.0")
    .asFloat(),
}

function isConfigValueEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === "string") return value.trim() === ""
  if (Array.isArray(value)) return value.length === 0
  return false
}

export function validateConfig() {
  const requiredForAll: (keyof ServerConfig)[] = [
    "DATABASE_URL",
    "SESSION_ENCRYPTION_KEY",
    "BASE_URL",
  ]

  const missing = requiredForAll.filter((key) =>
    isConfigValueEmpty(serverConfig[key]),
  )

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    )
  }

  if (serverConfig.SESSION_ENCRYPTION_KEY.length < 32) {
    throw new Error(
      "SESSION_ENCRYPTION_KEY must be at least 32 characters long",
    )
  }
}

export { type ClientConfig, clientConfig } from "./client"
