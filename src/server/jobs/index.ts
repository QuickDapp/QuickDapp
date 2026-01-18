/**
 * Unified Job System
 * Exports all job-related functionality for easy importing
 */

// Adapter for scheduling and managing jobs
export {
  scheduleUnifiedJob,
  scheduleUnifiedCronJob,
  cancelJob,
  cancelCronSchedule,
  type JobExecutor,
  type TriggerJobConfig,
} from "./trigger-adapter"

// Webhook handler for Trigger.dev status updates
export {
  handleTriggerWebhook,
  verifyWebhookSignature,
  type TriggerWebhookEvent,
} from "./trigger-webhook"

// Reconciliation system for server startup and periodic sync
export {
  reconcileTriggerJobs,
  syncActiveTriggerJobs,
  type ReconciliationReport,
} from "./trigger-reconcile"

// Re-export database worker functions for backward compatibility
export {
  scheduleJob,
  scheduleCronJob,
  getTotalPendingJobs,
  getNextPendingJob,
  getJobById,
  markJobAsStarted,
  markJobAsSucceeded,
  markJobAsFailed,
  rescheduleFailedJob,
  rescheduleCronJob,
  removeOldJobs,
  type WorkerJobConfig,
} from "../db/worker"
