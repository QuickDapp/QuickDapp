/**
 * Trigger.dev Reconciliation System
 * Syncs job state between local database and Trigger.dev on server startup
 * Ensures no jobs are lost during server restarts
 */

import { runs } from "@trigger.dev/sdk/v3"
import { eq, and, isNull, inArray } from "drizzle-orm"
import type { ServerApp } from "../types"
import { workerJobs } from "../db/schema"
import { logger } from "../lib/logger"

const log = logger({ category: "trigger-reconcile" })

export interface ReconciliationReport {
  totalJobs: number
  syncedJobs: number
  failedJobs: number
  orphanedJobs: number
  completedJobs: number
  errors: Array<{ jobId: number; error: string }>
}

/**
 * Reconcile all Trigger.dev jobs on server startup
 * Call this during server bootstrap
 */
export async function reconcileTriggerJobs(
  serverApp: ServerApp,
): Promise<ReconciliationReport> {
  log.info("Starting Trigger.dev job reconciliation")

  const report: ReconciliationReport = {
    totalJobs: 0,
    syncedJobs: 0,
    failedJobs: 0,
    orphanedJobs: 0,
    completedJobs: 0,
    errors: [],
  }

  try {
    // Find all unfinished Trigger.dev jobs in DB
    const unfinishedJobs = await serverApp.db
      .select()
      .from(workerJobs)
      .where(
        and(
          eq(workerJobs.executor, "trigger"),
          isNull(workerJobs.finished),
          eq(workerJobs.cancelRequested, false),
        ),
      )

    report.totalJobs = unfinishedJobs.length

    if (unfinishedJobs.length === 0) {
      log.info("No unfinished Trigger.dev jobs to reconcile")
      return report
    }

    log.info(`Found ${unfinishedJobs.length} unfinished Trigger.dev jobs`)

    // Process each job
    for (const job of unfinishedJobs) {
      try {
        await reconcileJob(serverApp, job, report)
      } catch (error) {
        report.failedJobs++
        const errorMsg =
          error instanceof Error ? error.message : String(error)
        report.errors.push({ jobId: job.id, error: errorMsg })
        log.error("Failed to reconcile job", {
          jobId: job.id,
          error: errorMsg,
        })
      }
    }

    log.info("Reconciliation complete", {
      total: report.totalJobs,
      synced: report.syncedJobs,
      completed: report.completedJobs,
      failed: report.failedJobs,
      orphaned: report.orphanedJobs,
    })

    return report
  } catch (error) {
    log.error("Reconciliation failed", { error })
    throw error
  }
}

/**
 * Reconcile a single job
 */
async function reconcileJob(
  serverApp: ServerApp,
  job: any,
  report: ReconciliationReport,
): Promise<void> {
  if (!job.triggerRunId) {
    // Job was created in DB but never triggered on Trigger.dev
    // This is orphaned - mark as failed
    await serverApp.db
      .update(workerJobs)
      .set({
        finished: new Date(),
        success: false,
        result: {
          error: "Job was never started on Trigger.dev (orphaned)",
        },
        updatedAt: new Date(),
      })
      .where(eq(workerJobs.id, job.id))

    report.orphanedJobs++
    log.warn("Orphaned job found (no run ID)", { jobId: job.id })
    return
  }

  try {
    // Fetch current status from Trigger.dev
    const runStatus = await runs.retrieve(job.triggerRunId)

    log.debug("Retrieved run status from Trigger.dev", {
      jobId: job.id,
      runId: job.triggerRunId,
      status: runStatus.status,
    })

    // Update DB based on Trigger.dev status
    switch (runStatus.status) {
      case "COMPLETED":
        await serverApp.db
          .update(workerJobs)
          .set({
            started: runStatus.startedAt
              ? new Date(runStatus.startedAt)
              : job.started,
            finished: runStatus.completedAt
              ? new Date(runStatus.completedAt)
              : new Date(),
            success: true,
            result: runStatus.output || {},
            triggerStatus: "COMPLETED",
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(workerJobs.id, job.id))

        report.completedJobs++
        log.info("Synced completed job", { jobId: job.id })
        break

      case "FAILED":
        await serverApp.db
          .update(workerJobs)
          .set({
            started: runStatus.startedAt
              ? new Date(runStatus.startedAt)
              : job.started,
            finished: runStatus.completedAt
              ? new Date(runStatus.completedAt)
              : new Date(),
            success: false,
            result: {
              error: runStatus.error || "Job failed",
            },
            triggerStatus: "FAILED",
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(workerJobs.id, job.id))

        report.syncedJobs++
        log.warn("Synced failed job", { jobId: job.id })
        break

      case "CANCELED":
        await serverApp.db
          .update(workerJobs)
          .set({
            finished: runStatus.completedAt
              ? new Date(runStatus.completedAt)
              : new Date(),
            success: false,
            result: { canceled: true },
            triggerStatus: "CANCELED",
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(workerJobs.id, job.id))

        report.syncedJobs++
        log.info("Synced canceled job", { jobId: job.id })
        break

      case "EXECUTING":
        // Job is still running - just update status
        await serverApp.db
          .update(workerJobs)
          .set({
            started: runStatus.startedAt
              ? new Date(runStatus.startedAt)
              : job.started || new Date(),
            triggerStatus: "EXECUTING",
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(workerJobs.id, job.id))

        report.syncedJobs++
        log.debug("Synced executing job", { jobId: job.id })
        break

      case "PENDING":
        // Job is queued but not started yet
        await serverApp.db
          .update(workerJobs)
          .set({
            triggerStatus: "PENDING",
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(workerJobs.id, job.id))

        report.syncedJobs++
        log.debug("Synced pending job", { jobId: job.id })
        break

      default:
        log.warn("Unknown run status", {
          jobId: job.id,
          status: runStatus.status,
        })
        report.syncedJobs++
    }
  } catch (error) {
    // Run not found on Trigger.dev - it may have been deleted or never existed
    log.error("Failed to retrieve run from Trigger.dev", {
      jobId: job.id,
      runId: job.triggerRunId,
      error,
    })

    // Mark as orphaned in DB
    await serverApp.db
      .update(workerJobs)
      .set({
        finished: new Date(),
        success: false,
        result: {
          error: "Run not found on Trigger.dev during reconciliation",
          runId: job.triggerRunId,
        },
        updatedAt: new Date(),
      })
      .where(eq(workerJobs.id, job.id))

    report.orphanedJobs++
  }
}

/**
 * Periodic sync for long-running jobs
 * Call this periodically (e.g., every 5 minutes) to keep status updated
 */
export async function syncActiveTriggerJobs(
  serverApp: ServerApp,
): Promise<void> {
  const activeJobs = await serverApp.db
    .select()
    .from(workerJobs)
    .where(
      and(
        eq(workerJobs.executor, "trigger"),
        isNull(workerJobs.finished),
        inArray(workerJobs.triggerStatus, ["PENDING", "EXECUTING"]),
      ),
    )

  if (activeJobs.length === 0) {
    return
  }

  log.debug(`Syncing ${activeJobs.length} active jobs`)

  const report: ReconciliationReport = {
    totalJobs: activeJobs.length,
    syncedJobs: 0,
    failedJobs: 0,
    orphanedJobs: 0,
    completedJobs: 0,
    errors: [],
  }

  for (const job of activeJobs) {
    try {
      await reconcileJob(serverApp, job, report)
    } catch (error) {
      log.error("Failed to sync active job", {
        jobId: job.id,
        error,
      })
    }
  }

  if (report.completedJobs > 0 || report.failedJobs > 0) {
    log.info("Active job sync results", {
      completed: report.completedJobs,
      failed: report.failedJobs,
      orphaned: report.orphanedJobs,
    })
  }
}
