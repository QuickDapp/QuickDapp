import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import {
  AUTH_METHOD,
  type AuthMethod,
  WEB2_WALLET_PREFIX,
} from "../../shared/constants"
import { type User, users } from "./schema"
import { type DatabaseOrTransaction, withTransaction } from "./shared"
import { createUserAuth, getUserAuthByIdentifier } from "./userAuth"

export type { User }

/**
 * Get user by ID
 */
export async function getUserById(
  db: DatabaseOrTransaction,
  id: number,
): Promise<User | undefined> {
  return db.startSpan("db.users.getUserById", async () => {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    return result[0]
  })
}

/**
 * Get user by wallet address
 */
export async function getUser(
  db: DatabaseOrTransaction,
  wallet: string,
): Promise<User | undefined> {
  return db.startSpan("db.users.getUser", async () => {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.wallet, wallet.toLowerCase()))
      .limit(1)

    return result[0]
  })
}

/**
 * Check if a user is disabled
 */
export async function isUserDisabled(
  db: DatabaseOrTransaction,
  userId: number,
): Promise<boolean> {
  return db.startSpan("db.users.isUserDisabled", async () => {
    const user = await getUserById(db, userId)
    return user?.disabled ?? false
  })
}

/**
 * Set user disabled status
 */
export async function setUserDisabled(
  db: DatabaseOrTransaction,
  userId: number,
  disabled: boolean,
): Promise<void> {
  return db.startSpan("db.users.setUserDisabled", async () => {
    await db
      .update(users)
      .set({ disabled, updatedAt: new Date() })
      .where(eq(users.id, userId))
  })
}

/**
 * Create user with wallet auth if they don't exist, otherwise return existing user
 */
export async function createUserIfNotExists(
  db: DatabaseOrTransaction,
  wallet: string,
): Promise<User> {
  return db.startSpan("db.users.createUserIfNotExists", async () => {
    return withTransaction(db, async (tx) => {
      // Check if user exists by wallet
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

        // Create wallet auth entry
        await createUserAuth(
          tx,
          user.id,
          AUTH_METHOD.WALLET,
          wallet.toLowerCase(),
        )
      }

      return user
    })
  })
}

/**
 * Create user with email auth, generating a synthetic wallet address
 */
export async function createEmailUserIfNotExists(
  db: DatabaseOrTransaction,
  email: string,
): Promise<User> {
  return db.startSpan("db.users.createEmailUserIfNotExists", async () => {
    return withTransaction(db, async (tx) => {
      // Check if email auth already exists
      const existingAuth = await getUserAuthByIdentifier(
        tx,
        AUTH_METHOD.EMAIL,
        email.toLowerCase(),
      )

      if (existingAuth) {
        // Return existing user
        const user = await getUserById(tx, existingAuth.userId)
        if (!user) {
          throw new Error("User not found for existing email auth")
        }
        return user
      }

      // Generate synthetic wallet for email user
      const syntheticWallet = `${WEB2_WALLET_PREFIX}${nanoid()}`

      // Create new user
      const result = await tx
        .insert(users)
        .values({
          wallet: syntheticWallet,
          settings: {},
        })
        .returning()

      const user = result[0]!

      // Create email auth entry
      await createUserAuth(tx, user.id, AUTH_METHOD.EMAIL, email.toLowerCase())

      return user
    })
  })
}

/**
 * Get user by auth identifier (email or wallet)
 */
export async function getUserByAuthIdentifier(
  db: DatabaseOrTransaction,
  authType: AuthMethod,
  authIdentifier: string,
): Promise<User | undefined> {
  return db.startSpan("db.users.getUserByAuthIdentifier", async () => {
    const auth = await getUserAuthByIdentifier(db, authType, authIdentifier)
    if (!auth) {
      return undefined
    }
    return getUserById(db, auth.userId)
  })
}

/**
 * Update user settings
 */
export async function updateUserSettings(
  db: DatabaseOrTransaction,
  wallet: string,
  settings: any,
): Promise<User | undefined> {
  return db.startSpan("db.users.updateUserSettings", async () => {
    const result = await db
      .update(users)
      .set({
        settings,
        updatedAt: new Date(),
      })
      .where(eq(users.wallet, wallet.toLowerCase()))
      .returning()

    return result[0]
  })
}
