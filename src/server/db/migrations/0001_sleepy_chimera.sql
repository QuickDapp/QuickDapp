CREATE TABLE "chain_filter_state" (
	"filter_name" text PRIMARY KEY NOT NULL,
	"last_processed_block" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
