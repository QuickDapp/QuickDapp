import { and, desc, eq, gte, lte, sql } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import type { JobAuditRecord } from "../queue/types"
import type { ServerApp } from "../types"
import { workerJobs } from "./schema"

/**
 * Record a job execution result in the audit log
 */
export async function recordJobExecution(
  serverApp: ServerApp,
  record: JobAuditRecord,
): Promise<void> {
  await serverApp.db.insert(workerJobs).values({
    jobId: record.jobId,
    type: record.type,
    userId: record.userId ?? null,
    data: record.data,
    result: record.result ?? null,
    error: record.error ?? null,
    status: record.status,
    startedAt: record.startedAt,
    completedAt: record.completedAt ?? null,
    durationMs: record.durationMs ?? null,
  })
}

/**
 * Get job execution history with optional filters
 */
export async function getJobHistory(
  db: PostgresJsDatabase,
  options: {
    jobType?: string
    status?: "completed" | "failed"
    userId?: number
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  } = {},
) {
  const {
    jobType,
    status,
    userId,
    startDate,
    endDate,
    limit = 100,
    offset = 0,
  } = options

  const conditions = []

  if (jobType) {
    conditions.push(eq(workerJobs.type, jobType))
  }

  if (status) {
    conditions.push(eq(workerJobs.status, status))
  }

  if (userId !== undefined) {
    conditions.push(eq(workerJobs.userId, userId))
  }

  if (startDate) {
    conditions.push(gte(workerJobs.createdAt, startDate))
  }

  if (endDate) {
    conditions.push(lte(workerJobs.createdAt, endDate))
  }

  const baseQuery = db.select().from(workerJobs)

  if (conditions.length > 0) {
    return await baseQuery
      .where(and(...conditions))
      .orderBy(desc(workerJobs.createdAt))
      .limit(limit)
      .offset(offset)
  }

  return await baseQuery
    .orderBy(desc(workerJobs.createdAt))
    .limit(limit)
    .offset(offset)
}

/**
 * Get job execution metrics and statistics
 */
export async function getJobMetrics(
  db: PostgresJsDatabase,
  options: {
    jobType?: string
    startDate?: Date
    endDate?: Date
  } = {},
) {
  const { jobType, startDate, endDate } = options

  const conditions = []

  if (jobType) {
    conditions.push(eq(workerJobs.type, jobType))
  }

  if (startDate) {
    conditions.push(gte(workerJobs.createdAt, startDate))
  }

  if (endDate) {
    conditions.push(lte(workerJobs.createdAt, endDate))
  }

  const baseQuery = db
    .select({
      totalJobs: sql<number>`count(*)`,
      completedJobs: sql<number>`sum(case when status = 'completed' then 1 else 0 end)`,
      failedJobs: sql<number>`sum(case when status = 'failed' then 1 else 0 end)`,
      avgDuration: sql<number>`avg(duration_ms)`,
      minDuration: sql<number>`min(duration_ms)`,
      maxDuration: sql<number>`max(duration_ms)`,
    })
    .from(workerJobs)

  let metrics

  if (conditions.length > 0) {
    const [result] = await baseQuery.where(and(...conditions))
    metrics = result
  } else {
    const [result] = await baseQuery
    metrics = result
  }

  if (!metrics) {
    return {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      successRate: 0,
      avgDurationMs: null,
      minDurationMs: null,
      maxDurationMs: null,
    }
  }

  return {
    totalJobs: Number(metrics.totalJobs),
    completedJobs: Number(metrics.completedJobs),
    failedJobs: Number(metrics.failedJobs),
    successRate:
      metrics.totalJobs > 0
        ? Number(metrics.completedJobs) / Number(metrics.totalJobs)
        : 0,
    avgDurationMs: metrics.avgDuration ? Number(metrics.avgDuration) : null,
    minDurationMs: metrics.minDuration ? Number(metrics.minDuration) : null,
    maxDurationMs: metrics.maxDuration ? Number(metrics.maxDuration) : null,
  }
}

/**
 * Clean up old audit records
 */
export async function cleanupAuditLog(
  db: PostgresJsDatabase,
  maxAgeMs: number,
): Promise<number> {
  const cutoffDate = new Date(Date.now() - maxAgeMs)

  const result = await db
    .delete(workerJobs)
    .where(
      and(
        lte(workerJobs.createdAt, cutoffDate),
        // Only delete completed jobs (don't delete running jobs)
        sql`${workerJobs.completedAt} IS NOT NULL`,
      ),
    )
    .execute()

  return result.length || 0
}

/**
 * Get recent failed jobs for debugging
 */
export async function getRecentFailures(
  db: PostgresJsDatabase,
  limit: number = 20,
) {
  return await db
    .select()
    .from(workerJobs)
    .where(eq(workerJobs.status, "failed"))
    .orderBy(desc(workerJobs.createdAt))
    .limit(limit)
}
