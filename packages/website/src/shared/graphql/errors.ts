export const GraphQLErrorCode = {
  INVALID_INPUT: "INVALID_INPUT",
  DATABASE_ERROR: "DATABASE_ERROR",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const

export type GraphQLErrorCode =
  (typeof GraphQLErrorCode)[keyof typeof GraphQLErrorCode]
