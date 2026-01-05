# Database

The database command provides comprehensive database management utilities using DrizzleORM and DrizzleKit. All database operations are designed to work seamlessly with QuickDapp's PostgreSQL-based architecture.

## Overview

```shell
bun run db <subcommand> [options]
```

The database command includes three main subcommands for different aspects of database management:

- **generate** - Create migration files from schema changes
- **push** - Apply schema changes directly to database (development)
- **migrate** - Run migration files safely (production)

## Subcommands

### `bun run db generate`

Generates DrizzleORM migration files based on changes in your database schema:

```shell
bun run db generate
```

**When to use:**
- After modifying `src/server/db/schema.ts`
- Before deploying to production
- When you need version-controlled database changes

**What it does:**
- Compares current schema with database state
- Creates timestamped migration files in `drizzle/` directory
- Generates SQL statements for schema changes
- Maintains migration history for rollbacks

**Output:**
```
🔧 Generating DrizzleORM migrations...
✅ Migrations generated successfully
```

**Generated files:**
```
drizzle/
├── 0001_initial_schema.sql
├── 0002_add_notifications_table.sql
└── meta/
    ├── _journal.json
    └── 0001_snapshot.json
```

### `bun run db push`

Pushes schema changes directly to the database without creating migration files:

```shell
bun run db push

# Force push (destructive changes)
bun run db push --force
```

**When to use:**
- During development for rapid iteration
- When testing schema changes locally
- For prototype and experimental changes

**⚠️ Development only:** This command bypasses migration files and should never be used in production.

**Options:**
- `--force` - Apply destructive changes without confirmation

**What it does:**
- Compares schema with current database state
- Applies changes directly via DDL statements
- Updates database immediately
- No migration file creation

**Output:**
```
📦 Pushing schema changes to database...
✅ Schema changes pushed successfully
```

### `bun run db migrate`

Runs pending migration files against the database:

```shell
bun run db migrate
```

**When to use:**
- In production deployments
- When applying versioned schema changes
- For controlled database updates

**Production safe:** This command only applies previously generated migration files.

**What it does:**
- Checks for pending migration files
- Applies migrations in chronological order
- Updates migration tracking table
- Maintains schema version history

**Output:**
```
🚀 Running DrizzleORM migrations...
✅ Migrations applied successfully
```

## Development Workflow

### Local Development

For rapid development iteration:

```shell
# 1. Modify schema in src/server/db/schema.ts
# 2. Generate migrations and types
bun run gen

# 3. Push changes to development database
bun run db push

# 4. Test your changes
bun run dev
```

### Preparing for Production

Before deploying schema changes:

```shell
# 1. Generate migration files and types
bun run gen

# 2. Review generated SQL files in drizzle/ directory
# 3. Commit migration files to version control
# 4. Deploy migrations in production
```

### Production Deployment

Safe production deployment workflow:

```shell
# 1. Pull latest code with migration files
git pull origin main

# 2. Apply migrations
NODE_ENV=production bun run db migrate

# 3. Start production server
NODE_ENV=production bun run build
```

## Configuration

Database commands use environment-specific configuration:

### Development
```bash
# .env.development
DATABASE_URL=postgresql://postgres:@localhost:5432/quickdapp_dev
```

### Test
```bash
# .env.test
DATABASE_URL=postgresql://postgres:@localhost:5432/quickdapp_test
```

### Production
```bash
# .env.production
DATABASE_URL=postgresql://user:pass@prod-host:5432/quickdapp_prod
```

## Schema Management

### Defining Schema

Database schema is defined in TypeScript:

```typescript
// src/server/db/schema.ts
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  wallet: text('wallet').unique().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

### Migration Files

Generated migrations are SQL files:

```sql
-- drizzle/0001_create_users.sql
CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "wallet" text UNIQUE NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
```

## Error Handling

### Common Issues

**Database Connection Failed:**
```shell
# Check database is running
brew services list | grep postgresql

# Verify connection string
echo $DATABASE_URL
```

**Migration Conflicts:**
```shell
# Reset development database (destructive)
bun run db push --force

# Or resolve conflicts manually in migration files
```

**Permission Denied:**
```shell
# Ensure database user has proper permissions
psql $DATABASE_URL -c "GRANT ALL PRIVILEGES ON DATABASE quickdapp_dev TO postgres;"
```

### Recovery Commands

**Reset Development Database:**
```shell
# WARNING: This destroys all data
bun run db push --force
```

**Check Migration Status:**
```shell
# View applied migrations in database
psql $DATABASE_URL -c "SELECT * FROM __drizzle_migrations;"
```

**Manual Migration Rollback:**
```shell
# Manually revert migration (advanced)
psql $DATABASE_URL -c "DELETE FROM __drizzle_migrations WHERE version = '0002';"
```

## Integration with Testing

Database commands integrate with QuickDapp's test suite:

```shell
# Test command automatically sets up database
bun run test  # Runs 'bun run db push --force' internally

# Manual test database setup
NODE_ENV=test bun run db push --force
```

## DrizzleKit Configuration

Database commands use `drizzle.config.ts`:

```typescript
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
```

## Best Practices

### Development
- Use `push` for rapid prototyping
- Always backup before destructive operations
- Test schema changes with sample data

### Production
- Always use `migrate` for production
- Generate migrations in development first
- Review migration SQL before deployment
- Backup database before major migrations

### Version Control
- Commit all migration files
- Never edit existing migration files
- Include schema snapshots in commits

The database command provides all necessary tools for managing QuickDapp's PostgreSQL database throughout the development lifecycle, from rapid prototyping to production deployments.