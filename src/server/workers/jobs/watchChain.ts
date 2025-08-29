import { serverConfig } from "../../../shared/config/server"
import { getFilterState, updateFilterState } from "../../db/filterState"
import * as createTokenFilter from "../chainFilters/createToken"
import * as sendTokenFilter from "../chainFilters/sendToken"
import type {
  ChainFilterModule,
  ChainFilterRegistry,
  JobParams,
  JobRunner,
} from "./types"

interface FilterModule {
  chainFilter: ChainFilterModule
  filter: any
  name: string
}

// Registry of all chain filters
const chainFilters: ChainFilterRegistry = {
  sendToken: sendTokenFilter,
  createToken: createTokenFilter,
}

// Active filters for this worker instance
const activeFilters: Record<string, FilterModule> = {}
let filtersCreated = false

const recreateFilters = async (params: JobParams) => {
  const { serverApp, log } = params
  const client = serverApp.publicClient

  if (!client) {
    log.error("Cannot create filters without chain client")
    return
  }

  log.info("Creating chain filters")

  // Clear existing filters
  Object.keys(activeFilters).forEach((key) => delete activeFilters[key])

  for (const filterName in chainFilters) {
    try {
      const chainFilter = chainFilters[filterName]
      let fromBlock: string | undefined

      // Skip filter state in test environment - always use "earliest"
      if (serverConfig.NODE_ENV !== "test") {
        // Get the last processed block for this filter
        const lastProcessedBlock = await getFilterState(serverApp, filterName)
        if (lastProcessedBlock !== null) {
          // Start from the next block after the last processed one
          // Convert to hex format as required by Ethereum RPC
          fromBlock = `0x${(lastProcessedBlock + 1).toString(16)}`
          log.debug(
            `Using saved filter state for ${filterName}: starting from block ${lastProcessedBlock + 1} (${fromBlock})`,
          )
        } else {
          // No saved state, use "latest" for development/production
          fromBlock = "latest"
          log.debug(
            `No saved filter state for ${filterName}, starting from latest block`,
          )
        }
      } else {
        // Test environment - let the filter use "earliest"
        fromBlock = undefined
        log.debug(`Test environment: ${filterName} will use earliest block`)
      }

      const filter = await chainFilter!.createFilter(client, fromBlock)

      if (filter) {
        activeFilters[filterName] = {
          chainFilter: chainFilter!,
          filter,
          name: filterName,
        }
        log.debug(`Created filter: ${filterName}`)
      } else {
        log.warn(`Failed to create filter: ${filterName}`)
      }
    } catch (err) {
      log.error(`Failed to create filter ${filterName}:`, err)
    }
  }

  filtersCreated = true
  log.info(`Created ${Object.keys(activeFilters).length} chain filters`)
}

export const run: JobRunner = async (params: JobParams) => {
  const { serverApp, log } = params
  const client = serverApp.publicClient

  if (!client) {
    log.error("No chain client available, skipping chain watching")
    return
  }

  // Create filters on first run
  if (!filtersCreated) {
    await recreateFilters(params)
  }

  // Process each active filter
  await Promise.all(
    Object.keys(activeFilters).map(async (filterName) => {
      const filterModule = activeFilters[filterName]!
      const filterLog = log.child(filterName)

      try {
        // Get filter changes from the blockchain
        const changes = await client.getFilterChanges({
          filter: filterModule.filter,
        })

        if (changes && changes.length > 0) {
          filterLog.debug(`Found ${changes.length} new events`)

          await filterModule.chainFilter.processChanges(
            serverApp,
            filterLog,
            changes,
          )

          // Update filter state with the highest block number processed
          // Skip in test environment
          if (serverConfig.NODE_ENV !== "test" && changes.length > 0) {
            const maxBlockNumber = Math.max(
              ...changes.map((change: any) => Number(change.blockNumber)),
            )
            await updateFilterState(serverApp, filterName, maxBlockNumber)
            filterLog.debug(`Updated filter state to block ${maxBlockNumber}`)
          }
        } else {
          filterLog.debug("No new events found")
        }
      } catch (err: any) {
        filterLog.error(`Error processing filter:`, err)

        // Sometimes filter fails because the node cluster has replaced the node
        // Recreate filters to handle this
        filterLog.info("Recreating filters due to error...")
        filtersCreated = false // Force recreation on next run
        await recreateFilters(params)
      }
    }),
  )
}

export const watchChainJob = {
  run,
}
