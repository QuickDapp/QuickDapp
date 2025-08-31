import {
  boolean,
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

// Worker jobs table for background task management
export const workerJobs = pgTable("worker_jobs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  userId: integer("user_id").notNull(),
  data: json("data").notNull(),
  due: timestamp("due").notNull(),
  started: timestamp("started"),
  finished: timestamp("finished"),
  removeAt: timestamp("remove_at").notNull(),
  success: boolean("success"),
  result: json("result"),
  cronSchedule: text("cron_schedule"),
  autoRescheduleOnFailure: boolean("auto_reschedule_on_failure")
    .default(false)
    .notNull(),
  autoRescheduleOnFailureDelay: integer("auto_reschedule_on_failure_delay")
    .default(0)
    .notNull(),
  removeDelay: integer("remove_delay").default(0).notNull(),
  rescheduledFromJob: integer("rescheduled_from_job"),
  persistent: boolean("persistent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Export types for use in application
export type Setting = typeof settings.$inferSelect
export type NewSetting = typeof settings.$inferInsert

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert

export type WorkerJob = typeof workerJobs.$inferSelect
export type NewWorkerJob = typeof workerJobs.$inferInsert
