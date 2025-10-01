import type { PgTransaction } from "drizzle-orm/pg-core"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import type * as schema from "./schema"

export type Database = PostgresJsDatabase<typeof schema>
export type Transaction = PgTransaction<any, typeof schema>
export type DatabaseOrTransaction = Database | Transaction

const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 50

/**
 * Detect if an error is a PostgreSQL serialization/deadlock error that can be retried.
 *
 * Checks for:
 * - Error code 40001 (serialization_failure)
 * - Error code 40P01 (deadlock_detected)
 * - Error messages containing "could not serialize" or "deadlock"
 *
 * @param error - The error to check
 * @returns true if the error is a serialization error that can be retried
 */
function isSerializationError(error: any): boolean {
  const errorCode = error?.code || error?.originalError?.code
  const errorMessage = error?.message || error?.originalError?.message || ""

  return (
    errorCode === "40001" || // serialization_failure
    errorCode === "40P01" || // deadlock_detected
    errorMessage.includes("could not serialize") ||
    errorMessage.includes("deadlock")
  )
}

/**
 * Execute a function within a transaction context with automatic retry on serialization failures.
 *
 * This wrapper provides robust transaction handling for concurrent database operations:
 * - Automatically retries on PostgreSQL serialization failures (40001, 40P01)
 * - Uses exponential backoff: 50ms → 100ms → 200ms
 * - Retries up to 3 times before throwing the error
 * - Detects and properly handles nested transactions (no retry for nested)
 *
 * **Nested Transaction Behavior:**
 * If the provided database context is already a transaction, it will be used directly
 * without retry logic. This prevents retry loops in nested transaction scenarios.
 *
 * **Retry Behavior:**
 * When a new transaction encounters a serialization failure, it will:
 * 1. Wait with exponential backoff (50ms, 100ms, 200ms)
 * 2. Retry the entire transaction function
 * 3. Throw the error after MAX_RETRIES attempts
 *
 * **Usage Example:**
 * ```typescript
 * import { withTransaction, type DatabaseOrTransaction } from "./shared"
 *
 * export async function createUser(
 *   db: DatabaseOrTransaction,
 *   wallet: string
 * ): Promise<User> {
 *   return withTransaction(db, async (tx) => {
 *     // Row-level locking for concurrent safety
 *     const existing = await tx
 *       .select()
 *       .from(users)
 *       .where(eq(users.wallet, wallet))
 *       .for("update")  // Locks the row
 *       .limit(1)
 *
 *     if (existing[0]) return existing[0]
 *
 *     const result = await tx.insert(users).values({ wallet }).returning()
 *     return result[0]!
 *   })
 * }
 * ```
 *
 * @param db - Database connection or existing transaction context
 * @param fn - Async function that performs database operations within the transaction
 * @returns Promise resolving to the return value of fn
 * @throws The last error encountered if all retries are exhausted
 */
export async function withTransaction<T>(
  db: DatabaseOrTransaction,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  // Check if db is already a transaction by looking for transaction-specific properties
  if ("rollback" in db && "commit" in db) {
    // It's already a transaction, use it directly (no retry logic for nested transactions)
    return fn(db as Transaction)
  }

  // It's a database connection, create a new transaction with retry logic
  let lastError: any
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await (db as Database).transaction(fn as any)
    } catch (error) {
      lastError = error

      // Only retry on serialization errors, and only if we haven't exhausted retries
      if (isSerializationError(error) && attempt < MAX_RETRIES - 1) {
        // Exponential backoff: 50ms, 100ms, 200ms
        const delayMs = INITIAL_RETRY_DELAY_MS * 2 ** attempt
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        continue
      }

      // Either not a serialization error, or we've exhausted retries
      throw error
    }
  }

  // Fallback: throw the last error (should never reach here due to throw in loop)
  throw lastError
}
