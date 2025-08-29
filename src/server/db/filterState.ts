import { eq } from "drizzle-orm"
import type { ServerApp } from "../types"
import { chainFilterState } from "./schema"

/**
 * Get the last processed block number for a given filter
 * Returns null if no state exists for this filter
 */
export const getFilterState = async (
  serverApp: ServerApp,
  filterName: string,
): Promise<number | null> => {
  const [state] = await serverApp.db
    .select({ lastProcessedBlock: chainFilterState.lastProcessedBlock })
    .from(chainFilterState)
    .where(eq(chainFilterState.filterName, filterName))
    .limit(1)

  return state?.lastProcessedBlock ?? null
}

/**
 * Update the last processed block for a filter
 * Creates a new record if one doesn't exist (upsert behavior)
 */
export const updateFilterState = async (
  serverApp: ServerApp,
  filterName: string,
  blockNumber: number,
): Promise<void> => {
  await serverApp.db
    .insert(chainFilterState)
    .values({
      filterName,
      lastProcessedBlock: blockNumber,
    })
    .onConflictDoUpdate({
      target: chainFilterState.filterName,
      set: {
        lastProcessedBlock: blockNumber,
        updatedAt: new Date(),
      },
    })
}

/**
 * Delete all filter state records (used for reset)
 */
export const resetAllFilterState = async (
  serverApp: ServerApp,
): Promise<void> => {
  await serverApp.db.delete(chainFilterState)
}
