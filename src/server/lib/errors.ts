/**
 * GraphQL error codes for consistent error handling throughout the application
 */
export enum GraphQLErrorCode {
  // Authentication errors
  UNAUTHORIZED = "UNAUTHORIZED",
  AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
  INVALID_SIGNATURE = "INVALID_SIGNATURE",

  // Database errors
  DATABASE_ERROR = "DATABASE_ERROR",

  // Generic errors
  NOT_FOUND = "NOT_FOUND",
  INVALID_INPUT = "INVALID_INPUT",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}
