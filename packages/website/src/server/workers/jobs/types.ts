import type { WorkerJob } from "../../db/schema"
import type { Logger } from "../../lib/logger"
import type { ServerApp } from "../../types"

export interface JobParams {
  serverApp: ServerApp
  log: Logger
  job: WorkerJob
}

export type JobRunner = (params: JobParams) => Promise<any>

export interface Job {
  run: JobRunner
}

export interface RemoveOldWorkerJobsData {}

export interface FetchGithubSettingsData {}

export type JobType = "removeOldWorkerJobs" | "fetchGithubSettings"

export type JobConfig<T extends JobType> = T extends "removeOldWorkerJobs"
  ? { type: T; data?: RemoveOldWorkerJobsData }
  : T extends "fetchGithubSettings"
    ? { type: T; data?: FetchGithubSettingsData }
    : never

export type JobDataType<T extends JobType> = T extends "removeOldWorkerJobs"
  ? RemoveOldWorkerJobsData
  : T extends "fetchGithubSettings"
    ? FetchGithubSettingsData
    : never

export const isValidJobType = (type: string): type is JobType => {
  return type === "removeOldWorkerJobs" || type === "fetchGithubSettings"
}

export type JobRegistry = Record<JobType, Job>
