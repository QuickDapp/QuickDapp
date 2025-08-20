import { removeOldWorkerJobsJob } from "./removeOldWorkerJobs"
import type { JobRegistry } from "./types"
import { watchChainJob } from "./watchChain"

// Job registry containing all available jobs
export const jobRegistry: JobRegistry = {
  removeOldWorkerJobs: removeOldWorkerJobsJob,
  watchChain: watchChainJob,
}

// Export all jobs for easy importing
export * from "./removeOldWorkerJobs"
export * from "./watchChain"
