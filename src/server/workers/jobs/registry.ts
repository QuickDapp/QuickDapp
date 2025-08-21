import { deployMulticall3Job } from "./deployMulticall3"
import { removeOldWorkerJobsJob } from "./removeOldWorkerJobs"
import type { JobRegistry } from "./types"
import { watchChainJob } from "./watchChain"

// Job registry containing all available jobs
export const jobRegistry: JobRegistry = {
  removeOldWorkerJobs: removeOldWorkerJobsJob,
  watchChain: watchChainJob,
  deployMulticall3: deployMulticall3Job,
}

// Export all jobs for easy importing
export * from "./deployMulticall3"
export * from "./removeOldWorkerJobs"
export * from "./watchChain"
