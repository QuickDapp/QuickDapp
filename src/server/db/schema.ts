import {
  boolean,
  index,
  integer,
  json,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

// Settings table for application configuration
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").unique().notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Users table for authentication and user management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  wallet: text("wallet").unique().notNull(),
  settings: json("settings"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Notifications table for user notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  data: json("data").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Worker jobs table for audit trail (Redis handles active queue)
export const workerJobs = pgTable(
  "worker_jobs",
  {
    id: serial("id").primaryKey(),

    // Essential job identification
    jobId: text("job_id").notNull().unique(), // BullMQ job ID
    type: text("type").notNull(), // Job type
    userId: integer("user_id"), // NULLABLE for system jobs

    // Job data and results
    data: json("data").notNull(), // Job input data
    result: json("result"), // Job output data
    error: text("error"), // Error message if failed

    // Execution metrics
    status: text("status").notNull(), // completed, failed
    startedAt: timestamp("started_at").notNull(), // When job started
    completedAt: timestamp("completed_at"), // When job finished
    durationMs: integer("duration_ms"), // Execution time in milliseconds

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    typeIdx: index("idx_worker_jobs_type").on(table.type),
    statusIdx: index("idx_worker_jobs_status").on(table.status),
    createdAtIdx: index("idx_worker_jobs_created_at").on(table.createdAt),
    jobIdIdx: index("idx_worker_jobs_job_id").on(table.jobId),
  }),
)

// Export types for use in application
export type Setting = typeof settings.$inferSelect
export type NewSetting = typeof settings.$inferInsert

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert

export type WorkerJob = typeof workerJobs.$inferSelect
export type NewWorkerJob = typeof workerJobs.$inferInsert
