import { eq } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import type * as schema from "./schema"
import { users } from "./schema"

export type Database = PostgresJsDatabase<typeof schema>

export interface User {
  id: number
  wallet: string
  settings: any
  createdAt: Date
  updatedAt: Date
}

/**
 * Get user by wallet address
 */
export async function getUser(
  db: Database,
  wallet: string,
): Promise<User | undefined> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.wallet, wallet.toLowerCase()))
    .limit(1)

  return result[0]
}

/**
 * Create user if they don't exist, otherwise return existing user
 */
export async function createUserIfNotExists(
  db: Database,
  wallet: string,
): Promise<User> {
  return db.transaction(async (tx) => {
    // Check if user exists
    let user = await getUser(tx, wallet)

    if (!user) {
      // Create new user
      const result = await tx
        .insert(users)
        .values({
          wallet: wallet.toLowerCase(),
          settings: {},
        })
        .returning()

      user = result[0]!
    }

    return user
  })
}

/**
 * Update user settings
 */
export async function updateUserSettings(
  db: Database,
  wallet: string,
  settings: any,
): Promise<User | undefined> {
  const result = await db
    .update(users)
    .set({
      settings,
      updatedAt: new Date(),
    })
    .where(eq(users.wallet, wallet.toLowerCase()))
    .returning()

  return result[0]
}
