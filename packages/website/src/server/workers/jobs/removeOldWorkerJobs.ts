import { removeOldJobs } from "../../db/worker"
import type { JobParams, JobRunner } from "./types"

export const run: JobRunner = async (params: JobParams) => {
  const { serverApp, job } = params

  await removeOldJobs(serverApp, { exclude: [job.id] })
}

export const removeOldWorkerJobsJob = {
  run,
}
