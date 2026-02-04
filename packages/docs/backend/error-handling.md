---
order: 30
---

# Error Handling

QuickDapp uses a structured error system with typed error classes on the server and consistent error codes in the GraphQL API. In production, error details are masked to prevent information leakage. Sentry captures errors automatically when configured.

## Error Classes

All custom errors extend `ApplicationError`, which adds a `code` and optional `metadata` to the standard `Error`. These classes are defined in [`src/server/lib/errors.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/lib/errors.ts):

| Class | GraphQL Code | When to Use |
|-------|-------------|-------------|
| `ValidationError` | `INVALID_INPUT` | User input fails validation |
| `AuthenticationError` | `AUTHENTICATION_FAILED` | Credentials are incorrect |
| `DatabaseError` | `DATABASE_ERROR` | Database operation fails |
| `NotFoundError` | `NOT_FOUND` | Requested resource doesn't exist |
| `ExternalServiceError` | `INTERNAL_ERROR` | Third-party API call fails |
| `AccountDisabledError` | `ACCOUNT_DISABLED` | Disabled user tries to access protected operation |

Usage in resolvers:

```typescript
import { ValidationError, NotFoundError } from "../lib/errors"

if (!email) {
  throw new ValidationError("Email is required")
}

const user = await findUser(db, userId)
if (!user) {
  throw new NotFoundError("User not found", { userId })
}
```

## GraphQL Error Codes

Error codes are defined in [`src/shared/graphql/errors.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/src/shared/graphql/errors.ts) and available on both client and server:

```typescript
enum GraphQLErrorCode {
  UNAUTHORIZED = "UNAUTHORIZED",
  AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
  INVALID_SIGNATURE = "INVALID_SIGNATURE",
  ACCOUNT_DISABLED = "ACCOUNT_DISABLED",
  OAUTH_CONFIG_ERROR = "OAUTH_CONFIG_ERROR",
  OAUTH_PROVIDER_ERROR = "OAUTH_PROVIDER_ERROR",
  OAUTH_STATE_INVALID = "OAUTH_STATE_INVALID",
  DATABASE_ERROR = "DATABASE_ERROR",
  NOT_FOUND = "NOT_FOUND",
  INVALID_INPUT = "INVALID_INPUT",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}
```

The client receives these in `error.response.errors[0].extensions.code`, making it straightforward to handle specific error types in the frontend.

## Error Masking

In development, full error messages and stack traces are returned in GraphQL responses for debugging. In production, errors from `ApplicationError` subclasses return their message and code, while unexpected errors are masked to prevent leaking implementation details.

## Sentry Integration

When `SENTRY_DSN` is configured, errors are automatically captured by Sentry with:

- **User context** — The authenticated user ID is attached to error reports
- **Performance tracing** — Database operations and resolver execution are traced via `startSpan()`
- **Worker errors** — Worker processes have their own Sentry DSN (`SENTRY_WORKER_DSN`) for separate error tracking

Configuration:

```bash
SENTRY_DSN=https://...@sentry.io/...
SENTRY_WORKER_DSN=https://...@sentry.io/...
SENTRY_TRACES_SAMPLE_RATE=1.0
SENTRY_PROFILE_SESSION_SAMPLE_RATE=1.0
```

## Adding Custom Error Types

Extend `ApplicationError` with a GraphQL error code:

```typescript
import { GraphQLErrorCode } from "../../shared/graphql/errors"
import { ApplicationError } from "./errors"

export class RateLimitError extends ApplicationError {
  constructor(message = "Too many requests", metadata?: Record<string, any>) {
    super(message, GraphQLErrorCode.INTERNAL_ERROR, metadata)
  }
}
```

To add a new error code, add it to the `GraphQLErrorCode` enum in `src/shared/graphql/errors.ts` — this makes it available to both client and server code.

See [`src/server/lib/errors.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/lib/errors.ts) for the error class implementations and [`src/shared/graphql/errors.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/src/shared/graphql/errors.ts) for the error code enum.
