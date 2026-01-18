/**
 * Example Trigger.dev Task
 * Demonstrates how to create tasks that integrate with QuickDapp's job tracking
 */

import { task, logger } from "@trigger.dev/sdk/v3"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

// Example: Heavy data processing task
export const processLargeDataset = task({
  id: "process-large-dataset",
  // Configure resources for this task
  machine: {
    cpu: 2,
    memory: 4, // 4GB RAM
  },
  // Retry configuration
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: { datasetId: string; userId: number }) => {
    logger.info("Processing large dataset", {
      datasetId: payload.datasetId,
      userId: payload.userId,
    })

    // Connect to database
    const client = postgres(process.env.DATABASE_URL!)
    const db = drizzle(client)

    try {
      // Simulate heavy processing
      const chunks = 10
      const results = []

      for (let i = 0; i < chunks; i++) {
        logger.info(`Processing chunk ${i + 1}/${chunks}`)

        // Simulate processing work
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // Trigger.dev automatically checkpoints here
        results.push({
          chunk: i,
          processed: true,
          timestamp: new Date(),
        })
      }

      logger.info("Dataset processing complete", {
        totalChunks: chunks,
        datasetId: payload.datasetId,
      })

      return {
        success: true,
        datasetId: payload.datasetId,
        chunksProcessed: chunks,
        results,
      }
    } finally {
      await client.end()
    }
  },
})

// Example: Cron task
export const dailyReportGeneration = task({
  id: "daily-report-generation",
  run: async (payload: { date?: string }) => {
    const reportDate = payload.date || new Date().toISOString()

    logger.info("Generating daily report", { date: reportDate })

    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 5000))

    return {
      success: true,
      reportDate,
      generatedAt: new Date().toISOString(),
    }
  },
})

// Example: Task that can be canceled mid-execution
export const cancellableTask = task({
  id: "cancellable-task",
  run: async (payload: { iterations: number }, { ctx }) => {
    logger.info("Starting cancellable task", { iterations: payload.iterations })

    for (let i = 0; i < payload.iterations; i++) {
      // Check if task was canceled
      if (ctx.run.isCancelled) {
        logger.warn("Task was canceled", { completedIterations: i })
        throw new Error("Task canceled by user")
      }

      logger.info(`Iteration ${i + 1}/${payload.iterations}`)
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    return {
      success: true,
      completedIterations: payload.iterations,
    }
  },
})

// Example: Task with error handling and retries
export const reliableEmailSender = task({
  id: "reliable-email-sender",
  retry: {
    maxAttempts: 5,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 60000,
    factor: 2,
  },
  run: async (payload: {
    to: string
    subject: string
    body: string
    userId: number
  }) => {
    logger.info("Sending email", {
      to: payload.to,
      subject: payload.subject,
      userId: payload.userId,
    })

    // Simulate email sending (replace with actual email service)
    const success = Math.random() > 0.3 // 70% success rate for demo

    if (!success) {
      throw new Error("Failed to send email - will retry")
    }

    logger.info("Email sent successfully", { to: payload.to })

    return {
      success: true,
      to: payload.to,
      sentAt: new Date().toISOString(),
    }
  },
})
