---
order: 55
---

# Gen

The `gen` command runs code generation for GraphQL types and database migrations.

## Usage

```shell
bun run gen              # Generate all types and migrations
bun run gen --verbose    # Detailed output
```

## What It Generates

The command runs two steps:

**Step 1: Type generation** — Generates TypeScript types from the GraphQL schema and (in the Web3 variant) ABI types from Solidity contracts. This ensures type safety between the schema definitions and the TypeScript code that uses them.

**Step 2: Database migrations** — Runs DrizzleORM's migration generator to detect schema changes in `src/server/db/schema.ts` and create SQL migration files in `src/server/db/migrations/`.

## When to Run

Run `bun run gen` after:

- Changing the GraphQL schema in `src/shared/graphql/schema.ts`
- Modifying the database schema in `src/server/db/schema.ts`
- Adding or updating types, queries, or mutations

## Automatic Generation

The dev server automatically watches for schema changes and regenerates types. You typically only need to run `gen` manually when you want to create migration files for production deployment.

See [`scripts/gen.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/scripts/gen.ts) for the implementation.
