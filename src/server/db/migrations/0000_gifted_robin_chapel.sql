CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"data" json NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet" text NOT NULL,
	"settings" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_wallet_unique" UNIQUE("wallet")
);
--> statement-breakpoint
CREATE TABLE "worker_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"user_id" integer NOT NULL,
	"data" json NOT NULL,
	"due" timestamp NOT NULL,
	"started" timestamp,
	"finished" timestamp,
	"remove_at" timestamp NOT NULL,
	"success" boolean,
	"result" json,
	"cron_schedule" text,
	"auto_reschedule_on_failure" boolean DEFAULT false NOT NULL,
	"auto_reschedule_on_failure_delay" integer DEFAULT 0 NOT NULL,
	"remove_delay" integer DEFAULT 0 NOT NULL,
	"rescheduled_from_job" integer,
	"persistent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;