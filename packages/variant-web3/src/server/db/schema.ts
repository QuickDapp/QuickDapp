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
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// Users table for authentication and user management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  disabled: boolean("disabled").default(false).notNull(),
  settings: json("settings"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// User authentication methods table
export const userAuth = pgTable(
  "user_auth",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    authType: text("auth_type").notNull(),
    authIdentifier: text("auth_identifier").unique().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    authLookupIdx: index("user_auth_type_identifier_idx").on(
      table.authType,
      table.authIdentifier,
    ),
  }),
)

// Notifications table for user notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  data: json("data").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// Worker jobs table for background task management
export const workerJobs = pgTable("worker_jobs", {
  id: serial("id").primaryKey(),
  tag: text("tag").notNull(),
  type: text("type").notNull(),
  userId: integer("user_id").notNull(),
  data: json("data").notNull(),
  due: timestamp("due", { withTimezone: true }).notNull(),
  started: timestamp("started", { withTimezone: true }),
  finished: timestamp("finished", { withTimezone: true }),
  removeAt: timestamp("remove_at", { withTimezone: true }).notNull(),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// Export types for use in application
export type Setting = typeof settings.$inferSelect
export type NewSetting = typeof settings.$inferInsert

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type UserAuth = typeof userAuth.$inferSelect
export type NewUserAuth = typeof userAuth.$inferInsert

export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert

export type WorkerJob = typeof workerJobs.$inferSelect
export type NewWorkerJob = typeof workerJobs.$inferInsert
