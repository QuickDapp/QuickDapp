CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "worker_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tag" text NOT NULL,
	"type" text NOT NULL,
	"user_id" integer NOT NULL,
	"data" json NOT NULL,
	"due" timestamp with time zone NOT NULL,
	"started" timestamp with time zone,
	"finished" timestamp with time zone,
	"remove_at" timestamp with time zone NOT NULL,
	"success" boolean,
	"result" json,
	"cron_schedule" text,
	"auto_reschedule_on_failure" boolean DEFAULT false NOT NULL,
	"auto_reschedule_on_failure_delay" integer DEFAULT 0 NOT NULL,
	"remove_delay" integer DEFAULT 0 NOT NULL,
	"rescheduled_from_job" integer,
	"persistent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
