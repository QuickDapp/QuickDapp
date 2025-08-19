/**
 * GraphQL error codes for consistent error handling throughout the application
 */
export enum GraphQLErrorCode {
  // Authentication errors
  UNAUTHORIZED = "UNAUTHORIZED",
  INVALID_SIGNATURE = "INVALID_SIGNATURE",

  // Database errors
  DATABASE_ERROR = "DATABASE_ERROR",

  // Generic errors
  NOT_FOUND = "NOT_FOUND",
  INVALID_INPUT = "INVALID_INPUT",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

/**
 * Log categories for consistent logging throughout the application
 */
export const LOG_CATEGORIES = {
  AUTH: "auth",
  GRAPHQL: "graphql",
  GRAPHQL_RESOLVERS: "graphql-resolvers",
  DATABASE: "database",
  WORKER_MANAGER: "worker-manager",
  WORKER: "worker",
} as const

export type LogCategory = (typeof LOG_CATEGORIES)[keyof typeof LOG_CATEGORIES]
