import { eq } from "drizzle-orm"
import { settings } from "./schema"
import type { Database } from "./shared"

export const getSetting = async (
  db: Database,
  key: string,
): Promise<string | null> => {
  const [result] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1)

  return result?.value || null
}

export const setSetting = async (
  db: Database,
  key: string,
  value: string,
): Promise<void> => {
  const existing = await getSetting(db, key)

  if (existing !== null) {
    await db
      .update(settings)
      .set({ value, updatedAt: new Date() })
      .where(eq(settings.key, key))
  } else {
    await db.insert(settings).values({ key, value })
  }
}
