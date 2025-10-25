---
order: 90
---

# db

This command provides comprehensive database management utilities using DrizzleORM and DrizzleKit. All database operations are designed to work seamlessly with QuickDapp's PostgreSQL-based architecture.

Usage:

```shell
bun run db <subcommand> [options]
```

The database command includes  main subcommands for different aspects of database management:

- **generate** - Create migration files from schema changes.
- **push** - Apply schema changes from migration files.

## Create migration files

```shell
bun run db generate
```

**When to use:**
- After modifying `src/server/db/schema.ts`

**What it does:**
- Compares current schema with database state
- Creates timestamped migration files in `src/server/db/migrations/` directory
- Generates SQL statements for schema changes
- Maintains migration history for rollbacks


## Apply migrations

```shell
bun run db push
```

**When to use:**
- After running `bun run db generate`
- For development and production deployments

**What it does:**
- Checks for pending migration files
- Applies migrations in chronological order
- Updates migration tracking table
- Maintains schema version history


## Production Deployment

Safe production deployment workflow:

```shell
# 1. Pull latest code with migration files
git pull origin main

# 2. Apply migrations
NODE_ENV=production bun run db push
```
