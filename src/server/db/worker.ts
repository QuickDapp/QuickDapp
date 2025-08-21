import { parseCronExpression } from "cron-schedule"
import {
  and,
  asc,
  eq,
  isNotNull,
  isNull,
  lte,
  notInArray,
  or,
} from "drizzle-orm"
import type { ServerApp } from "../types"
import { type NewWorkerJob, type WorkerJob, workerJobs } from "./schema"

const ONE_HOUR = 60 * 60 * 1000

export interface WorkerJobConfig<T = unknown> {
  type: string
  userId: number
  due?: Date
  data?: T
  autoRescheduleOnFailure?: boolean
  autoRescheduleOnFailureDelay?: number
  removeDelay?: number
}

const dateFrom = (timestamp: number): Date => new Date(timestamp)

const pendingJobsFilter = (extraCriteria: any = {}) => {
  const baseFilter = and(
    isNull(workerJobs.finished),
    or(
      isNull(workerJobs.started),
      lte(workerJobs.started, dateFrom(Date.now() - ONE_HOUR)),
    ),
  )

  // Only apply extraCriteria if it has actual content
  return extraCriteria && Object.keys(extraCriteria).length > 0
    ? and(baseFilter, extraCriteria)
    : baseFilter
}

const cancelPendingJobs = async (serverApp: ServerApp, filter: any) => {
  const now = new Date()

  await serverApp.db
    .update(workerJobs)
    .set({
      started: now,
      finished: now,
      success: false,
      result: { error: "Job cancelled due to new job being created" },
      updatedAt: now,
    })
    .where(and(pendingJobsFilter(), filter))
}

const sanitizeJobData = (data?: any): object => {
  return (data || {}) as object
}

const generateJobDates = (due?: Date, removeDelay?: number) => {
  due = due || new Date()

  return {
    due,
    removeAt: dateFrom(due.getTime() + (removeDelay || 0)),
  }
}

export const scheduleJob = async <T = unknown>(
  serverApp: ServerApp,
  job: WorkerJobConfig<T>,
): Promise<WorkerJob> => {
  await cancelPendingJobs(
    serverApp,
    and(eq(workerJobs.type, job.type), eq(workerJobs.userId, job.userId)),
  )

  const jobData = {
    userId: job.userId,
    ...generateJobDates(job.due, job.removeDelay),
    type: job.type,
    data: sanitizeJobData(job.data),
    autoRescheduleOnFailure: !!job.autoRescheduleOnFailure,
    autoRescheduleOnFailureDelay: job.autoRescheduleOnFailureDelay || 0,
    removeDelay: job.removeDelay || 0,
  } satisfies NewWorkerJob

  const [newJob] = await serverApp.db
    .insert(workerJobs)
    .values(jobData)
    .returning()

  if (!newJob) {
    throw new Error("Failed to create job")
  }

  return newJob
}

export const scheduleCronJob = async <T = unknown>(
  serverApp: ServerApp,
  job: WorkerJobConfig<T>,
  cronSchedule: string,
): Promise<WorkerJob> => {
  await cancelPendingJobs(
    serverApp,
    and(eq(workerJobs.type, job.type), eq(workerJobs.userId, job.userId)),
  )

  const nextDate = parseCronExpression(cronSchedule).getNextDate(new Date())

  const jobData = {
    userId: job.userId,
    ...generateJobDates(nextDate, job.removeDelay),
    type: job.type,
    data: sanitizeJobData(job.data),
    cronSchedule,
    autoRescheduleOnFailure: !!job.autoRescheduleOnFailure,
    autoRescheduleOnFailureDelay: job.autoRescheduleOnFailureDelay || 0,
    removeDelay: job.removeDelay || 0,
  } satisfies NewWorkerJob

  const [newJob] = await serverApp.db
    .insert(workerJobs)
    .values(jobData)
    .returning()

  if (!newJob) {
    throw new Error("Failed to create cron job")
  }

  return newJob
}

export const getTotalPendingJobs = async (
  serverApp: ServerApp,
): Promise<number> => {
  const result = await serverApp.db
    .select({ count: workerJobs.id })
    .from(workerJobs)
    .where(pendingJobsFilter())

  return result.length
}

export const getNextPendingJob = async (
  serverApp: ServerApp,
): Promise<WorkerJob | null> => {
  const [job] = await serverApp.db
    .select()
    .from(workerJobs)
    .where(pendingJobsFilter())
    .orderBy(asc(workerJobs.due))
    .limit(1)

  return job || null
}

export const getJobById = async (
  serverApp: ServerApp,
  id: number,
): Promise<WorkerJob | null> => {
  const [job] = await serverApp.db
    .select()
    .from(workerJobs)
    .where(eq(workerJobs.id, id))
    .limit(1)

  return job || null
}

export const markJobAsStarted = async (
  serverApp: ServerApp,
  id: number,
): Promise<WorkerJob> => {
  const [updatedJob] = await serverApp.db
    .update(workerJobs)
    .set({
      started: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workerJobs.id, id))
    .returning()

  if (!updatedJob) {
    throw new Error(`Job ${id} not found`)
  }

  return updatedJob
}

export const markJobAsSucceeded = async (
  serverApp: ServerApp,
  id: number,
  result?: object,
): Promise<WorkerJob> => {
  const [updatedJob] = await serverApp.db
    .update(workerJobs)
    .set({
      finished: new Date(),
      success: true,
      result,
      updatedAt: new Date(),
    })
    .where(eq(workerJobs.id, id))
    .returning()

  if (!updatedJob) {
    throw new Error(`Job ${id} not found`)
  }

  return updatedJob
}

export const markJobAsFailed = async (
  serverApp: ServerApp,
  id: number,
  result?: object,
): Promise<WorkerJob> => {
  const [updatedJob] = await serverApp.db
    .update(workerJobs)
    .set({
      finished: new Date(),
      success: false,
      result,
      updatedAt: new Date(),
    })
    .where(eq(workerJobs.id, id))
    .returning()

  if (!updatedJob) {
    throw new Error(`Job ${id} not found`)
  }

  return updatedJob
}

export const rescheduleFailedJob = async (
  serverApp: ServerApp,
  job: WorkerJob,
): Promise<WorkerJob> => {
  await cancelPendingJobs(
    serverApp,
    and(eq(workerJobs.type, job.type), eq(workerJobs.userId, job.userId)),
  )

  const dueDate = dateFrom(Date.now() + job.autoRescheduleOnFailureDelay)

  const jobData = {
    ...generateJobDates(dueDate, job.removeDelay),
    userId: job.userId,
    type: job.type,
    data: sanitizeJobData(job.data),
    cronSchedule: job.cronSchedule,
    autoRescheduleOnFailure: job.autoRescheduleOnFailure,
    autoRescheduleOnFailureDelay: job.autoRescheduleOnFailureDelay,
    removeDelay: job.removeDelay,
    rescheduledFromJob: job.id,
  } satisfies NewWorkerJob

  const [newJob] = await serverApp.db
    .insert(workerJobs)
    .values(jobData)
    .returning()

  if (!newJob) {
    throw new Error("Failed to reschedule job")
  }

  return newJob
}

export const rescheduleCronJob = async (
  serverApp: ServerApp,
  job: WorkerJob,
): Promise<WorkerJob> => {
  if (!job.cronSchedule) {
    throw new Error("Cannot reschedule job without cron schedule")
  }

  await cancelPendingJobs(
    serverApp,
    and(eq(workerJobs.type, job.type), eq(workerJobs.userId, job.userId)),
  )

  const nextDate = parseCronExpression(job.cronSchedule).getNextDate(new Date())

  const jobData = {
    ...generateJobDates(nextDate, job.removeDelay),
    userId: job.userId,
    type: job.type,
    data: sanitizeJobData(job.data),
    cronSchedule: job.cronSchedule,
    autoRescheduleOnFailure: job.autoRescheduleOnFailure,
    autoRescheduleOnFailureDelay: job.autoRescheduleOnFailureDelay,
    removeDelay: job.removeDelay,
    rescheduledFromJob: job.id,
  } satisfies NewWorkerJob

  const [newJob] = await serverApp.db
    .insert(workerJobs)
    .values(jobData)
    .returning()

  if (!newJob) {
    throw new Error("Failed to reschedule cron job")
  }

  return newJob
}

export const removeOldJobs = async (
  serverApp: ServerApp,
  { exclude }: { exclude?: number[] } = {},
): Promise<void> => {
  const conditions = [
    lte(workerJobs.removeAt, new Date()),
    isNotNull(workerJobs.started),
  ]

  if (exclude && exclude.length > 0) {
    conditions.push(notInArray(workerJobs.id, exclude))
  }

  await serverApp.db.delete(workerJobs).where(and(...conditions))
}
