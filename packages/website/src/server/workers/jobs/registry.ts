import { fetchGithubSettingsJob } from "./fetchGithubSettings"
import { removeOldWorkerJobsJob } from "./removeOldWorkerJobs"
import type { JobRegistry } from "./types"

export const jobRegistry: JobRegistry = {
  removeOldWorkerJobs: removeOldWorkerJobsJob,
  fetchGithubSettings: fetchGithubSettingsJob,
}

export { fetchGithubSettingsJob } from "./fetchGithubSettings"
export { removeOldWorkerJobsJob } from "./removeOldWorkerJobs"
