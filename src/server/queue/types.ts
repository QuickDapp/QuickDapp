// Type-safe job definitions using discriminated unions
export type Job =
  | { type: "watchChain"; data: { fromBlock?: bigint } }
  | { type: "deployMulticall3"; data: { forceRedeploy?: boolean } }
  | { type: "cleanupAuditLog"; data: { maxAge: number } }

export type JobType = Job["type"]

// Automatic type inference for job data
export type JobData<T extends JobType> = Extract<Job, { type: T }>["data"]

// BullMQ job wrapper with metadata
export interface QueueJob {
  id: string
  type: JobType
  userId: number | null
  data: any
}

// Job execution status
export type JobStatus = "completed" | "failed"

// Audit record for database
export interface JobAuditRecord {
  jobId: string
  type: string
  userId?: number | null
  data: any
  result?: any
  error?: string
  status: JobStatus
  startedAt: Date
  completedAt?: Date
  durationMs?: number
}
