/**
 * GraphQL error codes for consistent error handling throughout the application
 * Available on both client and server side
 */
export enum GraphQLErrorCode {
  // Database errors
  DATABASE_ERROR = "DATABASE_ERROR",

  // Generic errors
  NOT_FOUND = "NOT_FOUND",
  INVALID_INPUT = "INVALID_INPUT",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}
