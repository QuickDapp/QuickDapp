import { GraphQLErrorCode } from "../../shared/graphql/errors"

/**
 * Base application error class that all custom errors extend from
 */
export class ApplicationError extends Error {
  constructor(
    message: string,
    public code?: string,
    public metadata?: Record<string, any>,
  ) {
    super(message)
    this.name = this.constructor.name
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, GraphQLErrorCode.INVALID_INPUT, metadata)
  }
}

export class DatabaseError extends ApplicationError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, GraphQLErrorCode.DATABASE_ERROR, metadata)
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, GraphQLErrorCode.NOT_FOUND, metadata)
  }
}

export class ExternalServiceError extends ApplicationError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, GraphQLErrorCode.INTERNAL_ERROR, metadata)
  }
}
