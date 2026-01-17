import { removeOldWorkerJobsJob } from "./removeOldWorkerJobs"
import type { JobRegistry } from "./types"

// Job registry containing all available jobs
export const jobRegistry: JobRegistry = {
  removeOldWorkerJobs: removeOldWorkerJobsJob,
}

// Export individual job objects
export { removeOldWorkerJobsJob } from "./removeOldWorkerJobs"
