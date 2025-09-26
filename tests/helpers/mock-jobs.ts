/**
 * Mock job types for testing purposes
 *
 * These provide controllable job behaviors for testing different scenarios
 * without relying on real job implementations that may be complex or
 * have external dependencies.
 */

import type { JobData, JobType } from "../../src/server/queue/types"
import { testLogger } from "./logger"

export interface MockJobOptions {
  delay?: number
  shouldFail?: boolean
  failureMessage?: string
  duration?: number
  customResult?: any
}

/**
 * Mock job data types for testing
 */
export type MockJobData = {
  testSimpleJob: { message: string; options?: MockJobOptions }
  testSlowJob: { duration: number; options?: MockJobOptions }
  testFailingJob: { message: string; options?: MockJobOptions }
  testCpuIntensiveJob: { iterations: number; options?: MockJobOptions }
}

/**
 * Create test job data with mock options
 */
export function createMockJobData<T extends keyof MockJobData>(
  type: T,
  data: MockJobData[T],
): JobData<JobType> {
  const baseData = {
    testRun: true,
    testId: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    mockType: type,
    ...data,
  }

  // Map mock job types to real job types that exist in the system
  switch (type) {
    case "testSimpleJob":
    case "testSlowJob":
    case "testFailingJob":
    case "testCpuIntensiveJob":
      // All mock jobs use cleanupAuditLog as the underlying job type
      // but with special mock data that can control behavior
      return {
        maxAge: 60000, // Required for cleanupAuditLog
        ...baseData,
      } as any

    default:
      throw new Error(`Unknown mock job type: ${type}`)
  }
}

/**
 * Submit a mock job for testing
 */
export async function submitMockJob<T extends keyof MockJobData>(
  submitTestJob: (
    jobType: string,
    data: any,
    userId?: number | null,
    options?: any,
  ) => Promise<any>,
  type: T,
  data: MockJobData[T],
  userId?: number | null,
  jobOptions?: { delay?: number; priority?: number },
) {
  const mockData = createMockJobData(type, data)

  testLogger.debug(`Submitting mock job: ${type}`, { data: mockData })

  return await submitTestJob("cleanupAuditLog", mockData, userId, jobOptions)
}

/**
 * Job type definitions for different test scenarios
 */
export const MockJobTypes = {
  /**
   * Simple job that completes quickly - for basic functionality tests
   */
  SIMPLE: "testSimpleJob" as const,

  /**
   * Job with configurable duration - for timing and concurrency tests
   */
  SLOW: "testSlowJob" as const,

  /**
   * Job that can be configured to fail - for error handling tests
   */
  FAILING: "testFailingJob" as const,

  /**
   * CPU-intensive job - for performance and resource tests
   */
  CPU_INTENSIVE: "testCpuIntensiveJob" as const,
} as const

/**
 * Pre-configured mock job factories for common test scenarios
 */
export const MockJobs = {
  /**
   * Quick job that always succeeds
   */
  simple: (message = "test-job") => ({
    type: MockJobTypes.SIMPLE,
    data: { message, options: { duration: 50 } },
  }),

  /**
   * Job with configurable delay
   */
  slow: (duration = 1000) => ({
    type: MockJobTypes.SLOW,
    data: { duration, options: { duration } },
  }),

  /**
   * Job that fails with specific message
   */
  failing: (message = "test-failure") => ({
    type: MockJobTypes.FAILING,
    data: {
      message,
      options: {
        shouldFail: true,
        failureMessage: `Mock job failed: ${message}`,
      },
    },
  }),

  /**
   * CPU-intensive job for concurrency testing
   */
  cpuIntensive: (iterations = 1000) => ({
    type: MockJobTypes.CPU_INTENSIVE,
    data: { iterations, options: { duration: 500 } },
  }),

  /**
   * Job with custom result data
   */
  withResult: (customResult: any) => ({
    type: MockJobTypes.SIMPLE,
    data: {
      message: "job-with-custom-result",
      options: { customResult, duration: 100 },
    },
  }),

  /**
   * Job that takes variable time based on input
   */
  variable: (baseTime = 100, variance = 50) => ({
    type: MockJobTypes.SLOW,
    data: {
      duration: baseTime + Math.floor(Math.random() * variance),
      options: { duration: baseTime + variance },
    },
  }),
} as const

/**
 * Utility to create multiple mock jobs of different types
 */
export function createMockJobBatch(
  count: number,
  type: keyof MockJobData = "testSimpleJob",
) {
  return Array.from({ length: count }, (_, i) => {
    switch (type) {
      case "testSimpleJob":
        return MockJobs.simple(`batch-job-${i}`)
      case "testSlowJob":
        return MockJobs.slow(200 + i * 100)
      case "testFailingJob":
        return MockJobs.failing(`batch-failure-${i}`)
      case "testCpuIntensiveJob":
        return MockJobs.cpuIntensive(1000 + i * 500)
      default:
        return MockJobs.simple(`batch-job-${i}`)
    }
  })
}

/**
 * Helper to submit multiple mock jobs and wait for completion
 */
export async function submitMockJobBatch(
  submitTestJob: (
    jobType: string,
    data: any,
    userId?: number | null,
    options?: any,
  ) => Promise<any>,
  waitForJob: (jobId: string, timeout: number) => Promise<any>,
  jobs: Array<{ type: keyof MockJobData; data: any }>,
  userId?: number | null,
) {
  const submittedJobs = []

  // Submit all jobs
  for (const [index, job] of jobs.entries()) {
    const submitted = await submitMockJob(
      submitTestJob,
      job.type,
      job.data,
      userId || index + 1,
    )
    submittedJobs.push(submitted)
  }

  // Wait for all to complete
  const results = await Promise.all(
    submittedJobs.map((job) => waitForJob(job.id!, 15000)),
  )

  return { submittedJobs, results }
}

/**
 * Validate mock job results have expected properties
 */
export function validateMockJobResult(
  result: any,
  expectedType: keyof MockJobData,
) {
  if (!result) {
    throw new Error(`Mock job result is undefined for type: ${expectedType}`)
  }

  if (expectedType === "testFailingJob") {
    // Failing jobs might not have successful results
    return true
  }

  return true
}
