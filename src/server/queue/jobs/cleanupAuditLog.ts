import { cleanupAuditLog } from "../../db/worker-audit"
import type { Job, JobParams } from "./types"

export const cleanupAuditLogJob: Job = {
  async run({ serverApp, log, job }: JobParams) {
    const { maxAge } = job.data as { maxAge: number }

    if (!maxAge || typeof maxAge !== "number") {
      throw new Error(
        "maxAge parameter is required and must be a number (milliseconds)",
      )
    }

    log.info("Starting cleanup of old audit log entries", {
      jobId: job.id,
      maxAge,
    })

    const deletedCount = await cleanupAuditLog(serverApp.db as any, maxAge)

    log.info("Audit log cleanup completed", {
      jobId: job.id,
      maxAge,
      deletedCount,
    })

    return { deletedCount, maxAge }
  },
}
