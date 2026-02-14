---
order: 70
---

# Database

QuickDapp uses [DrizzleORM](https://orm.drizzle.com) to interface with a [PostgreSQL](https://postgres.com/) database. DrizzleORM provides type-safe queries that compile to efficient SQL, with full TypeScript integration so that you can catch errors before they reach production.

## Schema

The schema specifies what database tables will exist to store data in upon startup.

The schema is defined in TypeScript at [`src/server/db/schema.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/db/schema.ts). 

QuickDapp includes four core tables:

* **users** - stores user accounts. 
    * Authentication methods are stored separately in the `userAuth` table, so a single user can have multiple ways to sign in (email, OAuth, etc).
* **userAuth** - links authentication methods to users. 
    * Each row represents one auth method with its type (like "email" or "google") and identifier (the email address or provider user ID). 
    * The unique constraint on `authIdentifier` prevents duplicate registrations. 
    * Variants may add additional auth types (e.g. the [Web3 variant](../variants/web3/index.md) adds wallet-based authentication).
* **notifications** - stores user notifications with JSON data and read status. 
    * The application creates notifications through `ServerApp` and delivers them via [real-time notifications](./realtime-notifications.md).
* **workerJobs** - manages background job scheduling. 
    * Jobs have a due time, optional cron schedule for recurring execution, and fields for tracking status and results.


## Querying and updating

Code which directly queries and/or modifies the database data always lives in files located in `src/server/db`.

Code which requires access to the database must call one or methods within the `src/server/db/` files and never directly access the database. 

Examples of this can be found in the [GraphQL resolvers](https://github.com/QuickDapp/QuickDapp/blob/main/packages/base/src/server/graphql/resolvers.ts):

```typescript
// Get current user profile
me: async (_, __, context) => {
  const profile = await getUserById(serverApp.db, context.user.id)

  if (!profile) {
    throw new GraphQLError("User not found", {
      extensions: { code: GraphQLErrorCode.NOT_FOUND },
    })
  }

  return profile
}
```

The `getMyProfile` method sits within `src/server/db/users.ts`:

```typescript
export async function getUserById(
  db: DatabaseOrTransaction,
  id: number,
): Promise<User | undefined> {
  // use drizzleorm convention to query the db
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  return result[0]
}
```

## Transactions

Sometimes more than one query will be running against a database at the same time and there's a chance that invalid data is either stored or returned to the caller.

To avoid this issue databases support _[Transactions](https://grokipedia.com/page/Database_transaction)_. 

A transaction is one or more database queries grouped together whereby, if one query fails then they all fail. In other words, they must all completely successfully in order for the transaction to succeed. Otherwise the transaction is "rolled back", which just means that the database gets restored to the state was in before it started executing the transaction in the first place.

However, even with transactions it's still possible for multiple, simultaneously occurring transactions to cause each other to read invalid/stale data. 

The transation _isolation level_ determines the strictness with which transactions are executed in parallel. Simply put, the strictest level (which guarantees no conflicts) is the _Serializable_ isolation level.

At the Serializable isolation level a given transaction will fail immediately if there is already another active transaction operating on the same data within the database. Thus, the just-failed transaction should ideally be retried a little bit later once the other transaction has finished executing. 

QuickDapp does this plumbing for you.

It uses PostgreSQL's [SERIALIZABLE isolation level](https://www.postgresql.org/docs/current/transaction-iso.html) with automatic retry of a transaction upon conflicts. 

The automatic retry system uses an exponential backoff, i.e. each subsequent retry of the same transaction will be delayed by a bit more to give more time for the original conflicting transaction to finish executing. 

The [`withTransaction`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/db/shared.ts) can be used to wrap database queries within a transaction. Calls to this method can even be nested, i.e. you don't have to have keep track of whether you're already executing queries within a transaction - QuickDapp takes care of all the necessary plumbing behind the scenes.

```typescript
import { withTransaction } from "./db/shared"

const createUser = async(db: Database) => {
  await withTransaction(db, async (tx) => {
    // Create user
    const [user] = await tx.insert(users).values({}).returning()

    // Create auth record
    await tx.insert(userAuth).values({
      userId: user.id,
      authType: "email",
      authIdentifier: emailAddress.toLowerCase()
    })

    // Call another method with the 
    await createProfile(tx, user.id)

    // If anything fails, entire transaction rolls back
  })
}


const createProfile = async(db: DatabaseOrTransaction, userId: number) => {
  await withTransaction(db, async (tx) => {
    // If anything fails, entire transaction (including parent caller transaction) rolls back
    await tx.insert(profiles).values({})
  })
}
```

!!!
The transaction wrapper automatically retries up to 7 times when PostgreSQL reports a serialization conflict. 
!!!


## Deplying schema changes

When you make changes to the database schema definition you first need to re-generate the Typescript types and database migration SQL scripts:

```bash
bun run gen
```

Migration files are generated in [`src/server/db/migrations/`](https://github.com/QuickDapp/QuickDapp/blob/main/packages/base/src/server/db/migrations/). Never edit them after creation—instead, create a new migration for fixes.

Then the schema changes have to actually be deployed to the database, i.e. the tables have to be modified to match the new shcema. There are two ways of doing this:

* `bun run db push` - directly modify database tables without keeping track of the modification made. 
    * Use this for you local development environment databases, but NOT your production database.
* `bun run db migrate` - modify database tables using the previously generated migration SQL scripts and keep track of which scripts have been run so far.
    * Use this for your production environment database.

## Performance Patterns

All database operations that ship with QuickDapp are wrapped with [performance monitoring](../monitoring/performance.md) code. This provides visibility into query performance and helps identify slow queries in production. 

For example:

```typescript
export async function isUserDisabled(
  db: DatabaseOrTransaction,
  userId: number,
): Promise<boolean> {
  return db.startSpan("db.users.isUserDisabled", async () => {
    const user = await getUserById(db, userId)
    return user?.disabled ?? false
  })
}
```

When adding your own database operation methods you should do the same.

For complex queries involving multiple tables, use joins rather than separate queries to avoid [N+1 problems](https://medium.com/databases-in-simple-words/the-n-1-database-query-problem-a-simple-explanation-and-solutions-ef11751aef8a). 

GraphQL resolvers should never use field resolvers that trigger additional database calls—fetch all needed data in the parent resolver instead.
