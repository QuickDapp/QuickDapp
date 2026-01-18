/**
 * Trigger.dev Webhook Handler
 * Receives status updates from Trigger.dev and syncs to local database
 * Handles: run started, completed, failed, canceled
 */

import { eq } from "drizzle-orm"
import type { ServerApp } from "../types"
import { workerJobs } from "../db/schema"
import { logger } from "../lib/logger"
import { rescheduleCronJob } from "../db/worker"

const log = logger({ category: "trigger-webhook" })

export interface TriggerWebhookEvent {
  id: string
  type:
    | "RUN_CREATED"
    | "RUN_STARTED"
    | "RUN_COMPLETED"
    | "RUN_FAILED"
    | "RUN_CANCELED"
  run: {
    id: string
    status: "PENDING" | "EXECUTING" | "COMPLETED" | "FAILED" | "CANCELED"
    taskIdentifier: string
    payload: any
    output: any
    error: any
    metadata: {
      dbJobId?: string
      tag?: string
      userId?: string
    }
    createdAt: string
    startedAt?: string
    completedAt?: string
    updatedAt: string
    attemptCount: number
    attempt?: {
      id: string
      number: number
      status: string
      startedAt?: string
      completedAt?: string
      error?: any
      output?: any
    }
  }
}

/**
 * Process incoming webhook from Trigger.dev
 */
export async function handleTriggerWebhook(
  serverApp: ServerApp,
  event: TriggerWebhookEvent,
): Promise<void> {
  const { run } = event

  // Extract DB job ID from metadata
  const dbJobId = run.metadata?.dbJobId
    ? Number.parseInt(run.metadata.dbJobId)
    : null

  if (!dbJobId) {
    log.warn("Received webhook for run without dbJobId", {
      runId: run.id,
      eventType: event.type,
    })
    return
  }

  // Fetch existing job from DB
  const [existingJob] = await serverApp.db
    .select()
    .from(workerJobs)
    .where(eq(workerJobs.id, dbJobId))
    .limit(1)

  if (!existingJob) {
    log.error("Received webhook for non-existent job", {
      dbJobId,
      runId: run.id,
    })
    return
  }

  log.info("Processing Trigger.dev webhook", {
    eventType: event.type,
    dbJobId,
    runId: run.id,
    status: run.status,
  })

  switch (event.type) {
    case "RUN_CREATED":
      await handleRunCreated(serverApp, dbJobId, run)
      break

    case "RUN_STARTED":
      await handleRunStarted(serverApp, dbJobId, run)
      break

    case "RUN_COMPLETED":
      await handleRunCompleted(serverApp, dbJobId, run, existingJob)
      break

    case "RUN_FAILED":
      await handleRunFailed(serverApp, dbJobId, run, existingJob)
      break

    case "RUN_CANCELED":
      await handleRunCanceled(serverApp, dbJobId, run)
      break

    default:
      log.warn("Unknown webhook event type", { eventType: event.type })
  }
}

async function handleRunCreated(
  serverApp: ServerApp,
  dbJobId: number,
  run: TriggerWebhookEvent["run"],
): Promise<void> {
  await serverApp.db
    .update(workerJobs)
    .set({
      triggerRunId: run.id,
      triggerStatus: "PENDING",
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workerJobs.id, dbJobId))

  log.debug("Updated job with run created", { dbJobId, runId: run.id })
}

async function handleRunStarted(
  serverApp: ServerApp,
  dbJobId: number,
  run: TriggerWebhookEvent["run"],
): Promise<void> {
  const attemptId = run.attempt?.id

  await serverApp.db
    .update(workerJobs)
    .set({
      started: run.startedAt ? new Date(run.startedAt) : new Date(),
      triggerStatus: "EXECUTING",
      triggerAttemptId: attemptId,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workerJobs.id, dbJobId))

  log.debug("Updated job with run started", {
    dbJobId,
    runId: run.id,
    attemptId,
  })
}

async function handleRunCompleted(
  serverApp: ServerApp,
  dbJobId: number,
  run: TriggerWebhookEvent["run"],
  existingJob: any,
): Promise<void> {
  await serverApp.db
    .update(workerJobs)
    .set({
      finished: run.completedAt ? new Date(run.completedAt) : new Date(),
      success: true,
      result: run.output || {},
      triggerStatus: "COMPLETED",
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workerJobs.id, dbJobId))

  log.info("Job completed successfully", { dbJobId, runId: run.id })

  // If this was a cron job, reschedule it
  if (existingJob.cronSchedule && !existingJob.cancelRequested) {
    try {
      await rescheduleCronJob(serverApp, existingJob)
      log.debug("Rescheduled cron job", { dbJobId })
    } catch (error) {
      log.error("Failed to reschedule cron job", { error, dbJobId })
    }
  }
}

async function handleRunFailed(
  serverApp: ServerApp,
  dbJobId: number,
  run: TriggerWebhookEvent["run"],
  existingJob: any,
): Promise<void> {
  const errorDetails = run.error || run.attempt?.error || {}

  await serverApp.db
    .update(workerJobs)
    .set({
      finished: run.completedAt ? new Date(run.completedAt) : new Date(),
      success: false,
      result: {
        error: errorDetails,
        attemptCount: run.attemptCount,
      },
      triggerStatus: "FAILED",
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workerJobs.id, dbJobId))

  log.error("Job failed", {
    dbJobId,
    runId: run.id,
    attemptCount: run.attemptCount,
    error: errorDetails,
  })

  // Handle auto-retry for cron jobs
  if (existingJob.cronSchedule && !existingJob.cancelRequested) {
    try {
      await rescheduleCronJob(serverApp, existingJob)
      log.debug("Rescheduled failed cron job", { dbJobId })
    } catch (error) {
      log.error("Failed to reschedule cron job after failure", {
        error,
        dbJobId,
      })
    }
  }
}

async function handleRunCanceled(
  serverApp: ServerApp,
  dbJobId: number,
  run: TriggerWebhookEvent["run"],
): Promise<void> {
  await serverApp.db
    .update(workerJobs)
    .set({
      finished: run.completedAt ? new Date(run.completedAt) : new Date(),
      success: false,
      result: { canceled: true },
      triggerStatus: "CANCELED",
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workerJobs.id, dbJobId))

  log.info("Job canceled", { dbJobId, runId: run.id })
}

/**
 * Verify webhook signature (implement based on Trigger.dev documentation)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  // TODO: Implement signature verification
  // Trigger.dev uses HMAC SHA256 for webhook signatures
  // const crypto = require('crypto')
  // const expectedSignature = crypto
  //   .createHmac('sha256', secret)
  //   .update(payload)
  //   .digest('hex')
  // return signature === expectedSignature
  return true
}
