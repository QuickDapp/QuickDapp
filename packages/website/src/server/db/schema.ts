import {
  boolean,
  integer,
  json,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

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

export type Setting = typeof settings.$inferSelect
export type NewSetting = typeof settings.$inferInsert

export type WorkerJob = typeof workerJobs.$inferSelect
export type NewWorkerJob = typeof workerJobs.$inferInsert
