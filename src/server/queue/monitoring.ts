import type { Elysia } from "elysia"
import {
  Counter,
  collectDefaultMetrics,
  Histogram,
  register,
} from "prom-client"
import { jobQueue } from "./queues"

// Prometheus metrics (optional)
const jobDurationHistogram = new Histogram({
  name: "bullmq_job_duration_seconds",
  help: "Job processing duration in seconds",
  labelNames: ["job_type", "queue", "status"],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120], // seconds
})

const jobCounter = new Counter({
  name: "bullmq_jobs_total",
  help: "Total number of jobs processed",
  labelNames: ["job_type", "queue", "status"],
})

// Collect default Node.js metrics
collectDefaultMetrics()

/**
 * Set up basic queue monitoring endpoint (Bull Board dashboard disabled for now)
 */
export function setupBullBoard(app: Elysia): void {
  // Add basic queue health endpoint
  app.get("/admin/queues", async () => {
    const health = await getQueueHealth()
    return {
      message: "BullMQ Queue Status",
      ...health,
      note: "Bull Board dashboard not configured yet. Use /metrics for Prometheus metrics.",
    }
  })
}

/**
 * Set up Prometheus metrics endpoint
 */
export function setupMetrics(app: Elysia): void {
  app.get("/metrics", async () => {
    return {
      headers: { "Content-Type": register.contentType },
      body: await register.metrics(),
    }
  })
}

/**
 * Record job metrics for Prometheus
 */
export function recordJobMetrics(
  jobType: string,
  status: "completed" | "failed",
  durationSeconds: number,
): void {
  jobCounter.inc({
    job_type: jobType,
    queue: "jobs",
    status,
  })

  jobDurationHistogram.observe(
    {
      job_type: jobType,
      queue: "jobs",
      status,
    },
    durationSeconds,
  )
}

/**
 * Get queue health information
 */
export async function getQueueHealth() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    jobQueue.getWaiting(),
    jobQueue.getActive(),
    jobQueue.getCompleted(),
    jobQueue.getFailed(),
    jobQueue.getDelayed(),
  ])

  return {
    queue: "jobs",
    status: "healthy",
    counts: {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      total:
        waiting.length +
        active.length +
        completed.length +
        failed.length +
        delayed.length,
    },
    timestamp: new Date().toISOString(),
  }
}
