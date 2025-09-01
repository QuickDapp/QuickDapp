# Adding Jobs

Creating custom background jobs in QuickDapp involves defining job handlers, registering them with the worker system, and submitting jobs for processing. This guide covers the complete process of adding new job types to handle your application's specific requirements.

## Creating Job Handlers

### Basic Job Handler Structure

Job handlers are async functions that process job data:

```typescript
// src/server/workers/jobs/myCustomJob.ts
import type { JobHandler } from '../types'
import { createLogger } from '../../lib/logger'

const logger = createLogger('job-my-custom-job')

export interface MyCustomJobData {
  userId: number
  action: string
  parameters: Record<string, any>
}

export const myCustomJobHandler: JobHandler<MyCustomJobData> = async (job, { serverApp }) => {
  const { userId, action, parameters } = job.data
  
  logger.info('Starting custom job', { 
    jobId: job.id, 
    userId, 
    action 
  })
  
  try {
    // Your job logic here
    const result = await processCustomAction(action, parameters, userId)
    
    logger.info('Custom job completed', { 
      jobId: job.id, 
      result 
    })
    
    return result
    
  } catch (error) {
    logger.error('Custom job failed', { 
      jobId: job.id, 
      error: error.message 
    })
    throw error
  }
}

async function processCustomAction(action: string, params: any, userId: number) {
  // Implement your specific business logic
  switch (action) {
    case 'generateUserReport':
      return await generateUserReport(userId, params)
    case 'processPayment':
      return await processPayment(userId, params)
    default:
      throw new Error(`Unknown action: ${action}`)
  }
}
```

### Job Handler Types

Define TypeScript types for job data:

```typescript
// src/server/workers/types.ts
import type { ServerApp } from '../types'
import type { Job } from '../db/schema'

export interface JobContext {
  serverApp: ServerApp
  workerId: string
  logger: Logger
}

export type JobHandler<T = any> = (
  job: Job & { data: T },
  context: JobContext
) => Promise<any>

// Specific job data types
export interface EmailJobData {
  to: string
  subject: string
  template: string
  variables: Record<string, any>
}

export interface ReportJobData {
  userId: number
  reportType: 'weekly' | 'monthly' | 'custom'
  dateRange?: {
    from: string
    to: string
  }
  format: 'pdf' | 'csv' | 'json'
}

export interface DataProcessingJobData {
  sourceId: string
  operation: 'transform' | 'aggregate' | 'validate'
  config: Record<string, any>
}
```

## Registering Job Handlers

### Job Registry

Register your job handlers in the worker registry:

```typescript
// src/server/workers/registry.ts
import { deployTokenHandler } from './jobs/deployToken'
import { sendEmailHandler } from './jobs/sendEmail'
import { myCustomJobHandler } from './jobs/myCustomJob'
import type { JobHandler } from './types'

export const jobHandlers: Record<string, JobHandler> = {
  // Built-in handlers
  deployToken: deployTokenHandler,
  sendEmail: sendEmailHandler,
  sendNotification: sendNotificationHandler,
  processAnalytics: processAnalyticsHandler,
  
  // Custom handlers
  myCustomJob: myCustomJobHandler,
  generateReport: generateReportHandler,
  processPayment: processPaymentHandler,
  syncExternalData: syncExternalDataHandler
}

export function getJobHandler(type: string): JobHandler | null {
  return jobHandlers[type] || null
}

export function registerJobHandler(type: string, handler: JobHandler): void {
  jobHandlers[type] = handler
}
```

### Dynamic Registration

Register handlers dynamically at runtime:

```typescript
// Dynamic job registration example
export class JobRegistry {
  private handlers = new Map<string, JobHandler>()
  
  register(type: string, handler: JobHandler): void {
    if (this.handlers.has(type)) {
      throw new Error(`Job handler '${type}' already registered`)
    }
    
    this.handlers.set(type, handler)
    logger.info('Job handler registered', { type })
  }
  
  get(type: string): JobHandler | null {
    return this.handlers.get(type) || null
  }
  
  getAll(): string[] {
    return Array.from(this.handlers.keys())
  }
  
  // Auto-discovery from jobs directory
  async autoRegister(jobsDir: string): Promise<void> {
    const files = await fs.readdir(jobsDir)
    
    for (const file of files) {
      if (file.endsWith('.ts') || file.endsWith('.js')) {
        const jobName = file.replace(/\.(ts|js)$/, '')
        const module = await import(path.join(jobsDir, file))
        
        if (module.default || module[`${jobName}Handler`]) {
          const handler = module.default || module[`${jobName}Handler`]
          this.register(jobName, handler)
        }
      }
    }
  }
}
```

## Complex Job Examples

### Email Processing Job

Complete email job with template rendering and error handling:

```typescript
// src/server/workers/jobs/sendEmail.ts
import type { JobHandler } from '../types'
import { createLogger } from '../../lib/logger'
import nodemailer from 'nodemailer'
import { renderTemplate } from '../lib/templates'

const logger = createLogger('job-send-email')

export interface SendEmailJobData {
  to: string | string[]
  subject: string
  template?: string
  html?: string
  text?: string
  variables?: Record<string, any>
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

export const sendEmailHandler: JobHandler<SendEmailJobData> = async (job, { serverApp }) => {
  const { to, subject, template, html, text, variables, attachments } = job.data
  
  logger.info('Sending email', { 
    jobId: job.id, 
    to: Array.isArray(to) ? to.length : 1,
    template
  })
  
  try {
    // Create transporter
    const transporter = nodemailer.createTransporter({
      host: serverApp.config.SMTP_HOST,
      port: serverApp.config.SMTP_PORT,
      secure: serverApp.config.SMTP_SECURE,
      auth: {
        user: serverApp.config.SMTP_USER,
        pass: serverApp.config.SMTP_PASSWORD
      }
    })
    
    // Render template if specified
    let emailHtml = html
    let emailText = text
    
    if (template) {
      const rendered = await renderTemplate(template, variables || {})
      emailHtml = rendered.html
      emailText = rendered.text
    }
    
    // Send email
    const result = await transporter.sendMail({
      from: serverApp.config.SMTP_FROM,
      to,
      subject,
      html: emailHtml,
      text: emailText,
      attachments
    })
    
    logger.info('Email sent successfully', {
      jobId: job.id,
      messageId: result.messageId,
      accepted: result.accepted.length
    })
    
    return {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected
    }
    
  } catch (error) {
    logger.error('Failed to send email', {
      jobId: job.id,
      error: error.message
    })
    throw error
  }
}
```

### Data Processing Job

Complex data processing with progress updates:

```typescript
// src/server/workers/jobs/processDataset.ts
import type { JobHandler } from '../types'
import { createLogger } from '../../lib/logger'

const logger = createLogger('job-process-dataset')

export interface ProcessDatasetJobData {
  datasetId: string
  operations: Array<{
    type: 'transform' | 'filter' | 'aggregate'
    config: Record<string, any>
  }>
  outputFormat: 'json' | 'csv' | 'parquet'
  chunkSize?: number
}

export const processDatasetHandler: JobHandler<ProcessDatasetJobData> = async (job, { serverApp }) => {
  const { datasetId, operations, outputFormat, chunkSize = 1000 } = job.data
  
  logger.info('Starting dataset processing', { 
    jobId: job.id, 
    datasetId,
    operations: operations.length
  })
  
  try {
    // Load dataset metadata
    const dataset = await loadDataset(datasetId)
    const totalRows = dataset.rowCount
    let processedRows = 0
    
    // Initialize output writer
    const outputWriter = createOutputWriter(outputFormat, dataset.schema)
    
    // Process in chunks
    for (let offset = 0; offset < totalRows; offset += chunkSize) {
      const chunk = await loadDatasetChunk(datasetId, offset, chunkSize)
      
      // Apply operations
      let processedChunk = chunk
      for (const operation of operations) {
        processedChunk = await applyOperation(processedChunk, operation)
      }
      
      // Write results
      await outputWriter.writeChunk(processedChunk)
      
      // Update progress
      processedRows += chunk.length
      const progress = Math.round((processedRows / totalRows) * 100)
      
      await updateJobProgress(job.id, progress)
      
      logger.debug('Processed chunk', {
        jobId: job.id,
        progress,
        chunkSize: chunk.length
      })
    }
    
    // Finalize output
    const outputPath = await outputWriter.finalize()
    
    logger.info('Dataset processing completed', {
      jobId: job.id,
      outputPath,
      processedRows
    })
    
    return {
      outputPath,
      processedRows,
      operations: operations.length
    }
    
  } catch (error) {
    logger.error('Dataset processing failed', {
      jobId: job.id,
      error: error.message
    })
    throw error
  }
}

async function updateJobProgress(jobId: number, progress: number): Promise<void> {
  await db.update(jobs).set({
    progress,
    updatedAt: new Date()
  }).where(eq(jobs.id, jobId))
}
```

### API Integration Job

Job for integrating with external APIs:

```typescript
// src/server/workers/jobs/syncExternalData.ts
import type { JobHandler } from '../types'
import { createLogger } from '../../lib/logger'

const logger = createLogger('job-sync-external-data')

export interface SyncExternalDataJobData {
  source: 'coinbase' | 'etherscan' | 'custom'
  endpoint: string
  params: Record<string, any>
  destination: {
    table: string
    upsertKey: string[]
  }
  rateLimitDelay?: number
}

export const syncExternalDataHandler: JobHandler<SyncExternalDataJobData> = async (job, { serverApp }) => {
  const { source, endpoint, params, destination, rateLimitDelay = 1000 } = job.data
  
  logger.info('Starting external data sync', { 
    jobId: job.id, 
    source,
    endpoint 
  })
  
  try {
    // Get API configuration
    const apiConfig = getApiConfig(source)
    
    // Make API request with retry logic
    const response = await fetchWithRetry(endpoint, {
      headers: {
        'Authorization': `Bearer ${apiConfig.apiKey}`,
        'User-Agent': 'QuickDapp/1.0'
      },
      params
    })
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Transform data for database
    const transformedData = await transformApiData(data, source)
    
    // Batch insert/update with progress tracking
    const batchSize = 100
    let processedRecords = 0
    
    for (let i = 0; i < transformedData.length; i += batchSize) {
      const batch = transformedData.slice(i, i + batchSize)
      
      await upsertBatch(destination.table, batch, destination.upsertKey)
      processedRecords += batch.length
      
      // Rate limiting
      if (rateLimitDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, rateLimitDelay))
      }
      
      // Update progress
      const progress = Math.round((processedRecords / transformedData.length) * 100)
      await updateJobProgress(job.id, progress)
    }
    
    logger.info('External data sync completed', {
      jobId: job.id,
      recordsProcessed: processedRecords
    })
    
    return {
      recordsProcessed: processedRecords,
      source,
      endpoint
    }
    
  } catch (error) {
    logger.error('External data sync failed', {
      jobId: job.id,
      error: error.message
    })
    throw error
  }
}

async function fetchWithRetry(url: string, options: any, maxRetries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)
      
      if (response.status === 429) { // Rate limited
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60')
        logger.warn('Rate limited, retrying', { attempt, retryAfter })
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
        continue
      }
      
      return response
    } catch (error) {
      if (attempt === maxRetries) throw error
      
      const delay = Math.pow(2, attempt) * 1000 // Exponential backoff
      logger.warn('Request failed, retrying', { attempt, delay })
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw new Error('Max retries exceeded')
}
```

## Testing Custom Jobs

Test your custom jobs like any other component:

```typescript
// tests/workers/myCustomJob.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { myCustomJobJob } from '../../src/server/workers/jobs/myCustomJob'
import { createLogger } from '../../src/server/lib/logger'
import { createMockServerApp, setupTestDatabase } from '../helpers'

describe('MyCustomJob', () => {
  let mockServerApp: any
  let mockJob: any
  
  beforeEach(async () => {
    mockServerApp = await createMockServerApp()
    await setupTestDatabase(mockServerApp.db)
    
    mockJob = {
      id: 1,
      type: 'myCustomJob',
      userId: 1,
      data: {
        userId: 1,
        action: 'generateReport',
        parameters: { reportType: 'monthly' }
      }
    }
  })
  
  it('should process job successfully', async () => {
    const result = await myCustomJobJob.run({
      serverApp: mockServerApp,
      log: createLogger('test'),
      job: mockJob
    })
    
    expect(result).toBeDefined()
    expect(result.reportGenerated).toBe(true)
  })
  
  it('should handle invalid action', async () => {
    mockJob.data.action = 'invalidAction'
    
    await expect(
      myCustomJobJob.run({
        serverApp: mockServerApp,
        log: createLogger('test'),
        job: mockJob
      })
    ).rejects.toThrow('Unknown action: invalidAction')
  })
})
```

## Summary

Adding custom jobs to QuickDapp involves:

1. **Define job data types** in `types.ts`
2. **Create job handler** with simple `run` function
3. **Register job** in the registry
4. **Submit jobs** through WorkerManager
5. **Test thoroughly** with unit and integration tests

The system is intentionally simple and focused on maintenance tasks. For complex workflows, consider using the database to coordinate between multiple simple jobs rather than creating complex job handlers.

