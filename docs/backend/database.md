# Database

QuickDapp uses [DrizzleORM](https://orm.drizzle.team/) with PostgreSQL to provide type-safe, high-performance database access. DrizzleORM offers the best of both worlds: the type safety of an ORM with the performance of raw SQL.

## Why DrizzleORM?

* **Type Safety** - Full TypeScript integration with compile-time checks
* **Performance** - Generates efficient SQL queries, no N+1 problems
* **Developer Experience** - Intuitive API that feels like writing SQL
* **Migrations** - Schema migrations with version control
* **Raw SQL Support** - Drop down to raw SQL when needed

## Database Schema

The database schema is defined in TypeScript using Drizzle's schema builder:

```typescript
// src/server/db/schema.ts
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
  persistent: boolean("persistent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
```

## Database Operations

### Basic Queries

```typescript
import { eq, and, or, like, desc } from 'drizzle-orm'
import { users, notifications, workerJobs, settings } from './schema'

// Select all users
const allUsers = await serverApp.db.select().from(users)

// Select specific fields
const userWallets = await serverApp.db
  .select({ wallet: users.wallet })
  .from(users)

// Find user by wallet address
const user = await serverApp.db
  .select()
  .from(users)
  .where(eq(users.wallet, '0x1234...'))
  .then(rows => rows[0])

// Find notifications for a user
const userNotifications = await serverApp.db
  .select()
  .from(notifications)
  .where(eq(notifications.userId, 1))
  .orderBy(desc(notifications.createdAt))
  .limit(10)
  .offset(20)
```

### Complex Queries with Joins

```typescript
// Join notifications with their users
const notificationsWithUsers = await serverApp.db
  .select({
    notification: notifications,
    user: users
  })
  .from(notifications)
  .leftJoin(users, eq(notifications.userId, users.id))

// Find unread notifications for a specific wallet
const unreadNotifications = await serverApp.db
  .select()
  .from(notifications)
  .innerJoin(users, eq(notifications.userId, users.id))
  .where(and(
    eq(users.wallet, walletAddress),
    eq(notifications.read, false)
  ))
```

### Insert Operations

```typescript
// Insert single user
const [user] = await serverApp.db
  .insert(users)
  .values({
    wallet: '0x1234567890123456789012345678901234567890',
    settings: { theme: 'dark', notifications: true }
  })
  .returning()

// Insert multiple notifications
const newNotifications = await serverApp.db
  .insert(notifications)
  .values([
    { 
      userId: 1, 
      data: { type: 'token_deployed', tokenName: 'MyToken' },
      read: false
    },
    { 
      userId: 1, 
      data: { type: 'transaction_confirmed', txHash: '0xabc...' },
      read: false
    },
  ])
  .returning()

// Insert with conflict handling (upsert user)
const [user] = await serverApp.db
  .insert(users)
  .values({ 
    wallet: '0x1234567890123456789012345678901234567890',
    settings: { theme: 'light' }
  })
  .onConflictDoUpdate({
    target: users.wallet,
    set: {
      settings: excluded(users.settings),
      updatedAt: new Date()
    }
  })
  .returning()
```

### Update Operations

```typescript
// Update single record
await serverApp.db
  .update(userTable)
  .set({ 
    nonce: newNonce,
    updatedAt: new Date()
  })
  .where(eq(userTable.id, userId))

// Update with conditions
await serverApp.db
  .update(tokenTable)
  .set({ name: 'New Token Name' })
  .where(and(
    eq(tokenTable.id, tokenId),
    eq(tokenTable.ownerId, userId)
  ))
```

### Delete Operations

```typescript
// Delete single record
await serverApp.db
  .delete(tokenTable)
  .where(eq(tokenTable.id, tokenId))

// Delete with conditions
await serverApp.db
  .delete(userTable)
  .where(and(
    eq(userTable.address, address),
    eq(userTable.isAdmin, false)
  ))
```

## Transactions

DrizzleORM provides transaction support for atomic operations:

```typescript
// Basic transaction
await serverApp.db.transaction(async (tx) => {
  // Create user
  const [user] = await tx
    .insert(userTable)
    .values({ address: '0x1234...', nonce: 'abc123' })
    .returning()

  // Create token for user
  await tx
    .insert(tokenTable)
    .values({
      name: 'User Token',
      symbol: 'UTK',
      ownerId: user.id
    })
  
  // If anything fails, entire transaction is rolled back
})

// Transaction with return value
const result = await serverApp.db.transaction(async (tx) => {
  const [user] = await tx
    .insert(userTable)
    .values(userData)
    .returning()
    
  const [token] = await tx
    .insert(tokenTable)
    .values({ ...tokenData, ownerId: user.id })
    .returning()
    
  return { user, token }
})
```

## Schema Migrations

### Generating Migrations

When you modify the schema, generate a migration:

```shell
# Generate migration from schema changes
bun run db generate

# This creates a new migration file in src/server/db/migrations/
```

### Running Migrations

```shell
# Development: Push schema directly (destructive)
bun run db push

# Production: Run migrations safely
bun run db migrate
```

### Migration Files

Generated migration files look like this:

```sql
-- src/server/db/migrations/0001_add_token_table.sql
CREATE TABLE IF NOT EXISTS "tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "address" text NOT NULL,
  "name" text NOT NULL,
  "symbol" text NOT NULL,
  "owner_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "tokens_address_unique" UNIQUE("address")
);

ALTER TABLE "tokens" ADD CONSTRAINT "tokens_owner_id_users_id_fk" 
FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
```

## Advanced Patterns

### Custom SQL

When you need complex queries, drop down to raw SQL:

```typescript
import { sql } from 'drizzle-orm'

// Raw SQL with parameters
const result = await serverApp.db.execute(
  sql`
    SELECT t.*, u.address as owner_address
    FROM tokens t
    JOIN users u ON t.owner_id = u.id
    WHERE t.created_at > ${fromDate}
    ORDER BY t.created_at DESC
  `
)

// Raw SQL in select
const tokensWithCounts = await serverApp.db
  .select({
    user: userTable,
    tokenCount: sql<number>`cast(count(${tokenTable.id}) as int)`
  })
  .from(userTable)
  .leftJoin(tokenTable, eq(userTable.id, tokenTable.ownerId))
  .groupBy(userTable.id)
```

### Database Views

Create views for complex queries:

```typescript
// Create a view in migration
const userStatsView = pgView('user_stats', {
  userId: uuid('user_id'),
  address: text('address'),
  tokenCount: integer('token_count'),
}).as((qb) => 
  qb.select({
    userId: userTable.id,
    address: userTable.address,
    tokenCount: count(tokenTable.id),
  })
  .from(userTable)
  .leftJoin(tokenTable, eq(userTable.id, tokenTable.ownerId))
  .groupBy(userTable.id, userTable.address)
)

// Use view in queries
const userStats = await serverApp.db
  .select()
  .from(userStatsView)
  .where(gt(userStatsView.tokenCount, 0))
```

### Connection Management

The database connection is managed centrally:

```typescript
// src/server/db/connection.ts
class DatabaseManager {
  private connection?: PostgresJsDatabase
  
  async connect(): Promise<PostgresJsDatabase> {
    if (this.connection) return this.connection
    
    const client = postgres(serverConfig.DATABASE_URL, {
      max: 10, // Connection pool size
      idle_timeout: 20,
      connect_timeout: 10,
    })
    
    this.connection = drizzle(client)
    return this.connection
  }
  
  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end()
      this.connection = undefined
    }
  }
}

export const dbManager = new DatabaseManager()
```

## Testing Patterns

### Test Database Setup

```typescript
// tests/helpers/database.ts
export async function setupTestDatabase(db: PostgresJsDatabase) {
  // Clear all tables
  await db.delete(tokenTable)
  await db.delete(userTable)
  
  // Reset sequences
  await db.execute(sql`ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1`)
  await db.execute(sql`ALTER SEQUENCE IF EXISTS tokens_id_seq RESTART WITH 1`)
}

export async function createTestUser(db: PostgresJsDatabase) {
  const [user] = await db
    .insert(userTable)
    .values({
      address: '0x' + Math.random().toString(16).slice(2, 42),
      nonce: Math.random().toString()
    })
    .returning()
    
  return user
}
```

### Database Tests

```typescript
describe('User Database Operations', () => {
  let serverApp: ServerApp
  
  beforeEach(async () => {
    serverApp = await createTestServerApp()
    await setupTestDatabase(serverApp.db)
  })
  
  it('creates users correctly', async () => {
    const user = await serverApp.db
      .insert(userTable)
      .values({
        address: '0x1234567890123456789012345678901234567890',
        nonce: 'test-nonce'
      })
      .returning()
      .then(rows => rows[0])
    
    expect(user.id).toBeDefined()
    expect(user.address).toBe('0x1234567890123456789012345678901234567890')
  })
})
```

DrizzleORM provides a powerful, type-safe way to interact with your PostgreSQL database while maintaining excellent performance and developer experience.