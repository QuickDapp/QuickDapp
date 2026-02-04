---
order: 50
---

# Test

The test command runs the integration test suite with database isolation and parallel execution.

## Running Tests

```shell
bun run test                    # Run all tests
bun run test --pattern auth     # Run matching tests
bun run test --watch            # Watch mode
bun run test --verbose          # Debug logging
bun run test --bail             # Stop on first failure
bun run test --timeout 60000    # Custom timeout (ms)
bun run test -c 4               # Set concurrency (parallel workers)
bun run test -f auth.test.ts    # Run specific test file
```

## How It Works

Tests use PostgreSQL template databases for parallel execution. Before tests start, the runner pushes the schema to a template database. Each test file then gets its own clone of that template, providing complete isolation without the overhead of schema setup per file.

Test files are ordered by duration (longest first) to optimize parallel execution. The `tests/test-run-order.json` file tracks this and is auto-updated after each run.

## Parallel Architecture

Each test file receives:
- A unique server port (base port + file index)
- Its own database cloned from the template
- An isolated `ServerApp` instance

This allows multiple test files to run simultaneously without database conflicts. After completion, each cloned database is dropped.

## Test Structure

```
tests/
├── helpers/              # Test utilities
│   ├── server.ts        # Server lifecycle
│   ├── test-config.ts   # Port and database assignment
│   └── auth.ts          # Auth helpers
└── server/              # Integration tests
    ├── auth/            # Authentication tests
    └── graphql/         # GraphQL tests
```

## Writing Tests

```typescript
import "@tests/helpers/test-config"  // Must be first import

import { beforeAll, afterAll, test, expect } from 'bun:test'
import { startTestServer } from '../helpers/server'
import type { TestServer } from '../helpers/server'

let testServer: TestServer

beforeAll(async () => {
  testServer = await startTestServer()
})

afterAll(async () => {
  await testServer.shutdown()
})

test('example test', async () => {
  // Test implementation
})
```

The `@tests/helpers/test-config` import must come first—it sets environment variables (port, database URL) before `serverConfig` caches them at module load time.

## Debugging

Enable verbose logging with a temporary config file:

```shell
bun run test --verbose
```

This creates `.env.test.local` with `LOG_LEVEL=debug` and `WORKER_LOG_LEVEL=debug`, which is cleaned up after the run.

For persistent debug config:

```shell
echo "LOG_LEVEL=debug" > .env.test.local
bun run test
rm .env.test.local
```

## Environment

Tests use `.env.test` for configuration:

```bash
NODE_ENV=test
DATABASE_URL=postgresql://postgres:@localhost:5432/quickdapp_test
```

The test database should be separate from development to avoid data conflicts.
