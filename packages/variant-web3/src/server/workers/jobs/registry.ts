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

// Export individual job objects (avoiding conflicts from multiple 'run' exports)
export { deployMulticall3Job } from "./deployMulticall3"
export { removeOldWorkerJobsJob } from "./removeOldWorkerJobs"
export { watchChainJob } from "./watchChain"
