import { serverConfig } from "../../../shared/config/server"
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

  if (Object.keys(activeFilters).length) {
    log.info("Recreating chain filters")
    // Clear existing filters
    Object.keys(activeFilters).forEach((key) => delete activeFilters[key])
  } else {
    log.info("Creating chain filters")
  }

  for (const filterName in chainFilters) {
    try {
      const chainFilter = chainFilters[filterName]

      const fromBlock =
        serverConfig.NODE_ENV === "test"
          ? BigInt(1) // Start from block 1 in test mode to catch all events
          : await client.getBlockNumber()

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
  for (const filterName of Object.keys(activeFilters)) {
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
      } else {
        filterLog.debug("No new events found")
      }
    } catch (err: any) {
      filterLog.error(`Error processing filter:`, err)

      // Sometimes filter fails because the node cluster has replaced the node
      // Recreate filters to handle this
      filterLog.info("Recreating filters due to error...")
      filtersCreated = false // Force recreation on next run
    }
  }
}

export const watchChainJob = {
  run,
}
