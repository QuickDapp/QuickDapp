---
order: 93
icon: BeakerIcon
expanded: true
---

# Testing

QuickDapp includes a robust testing infrastructure built on Bun's native test runner. The system supports parallel test execution with complete database isolation, ensuring tests run quickly without interfering with each other.

## Architecture Overview

The test framework consists of three main parts:

- **Test runner** (`scripts/test.ts`) — Orchestrates parallel test execution, manages database templates, and tracks test durations
- **Template database** — A pre-configured PostgreSQL database cloned for each test file, avoiding schema setup overhead
- **Test helpers** (`tests/helpers/`) — Utilities for starting test servers, managing authentication, and configuring isolated resources

## How Parallel Execution Works

Each test file receives its own isolated environment:

| Resource | Allocation |
|----------|-----------|
| Server port | 54000 + file index |
| Database | `quickdapp_test_{index}` cloned from template |
| ServerApp | Fresh instance per test file |

Before tests run, the runner pushes the schema to a template database (`quickdapp_test`). Each test file then clones this template, runs its tests, and drops the cloned database afterward. This approach provides complete isolation while avoiding the cost of running migrations for every file.

## Duration-Based Ordering

The file `tests/test-run-order.json` tracks how long each test file takes to execute. The test runner orders files by duration (longest first) to optimize parallel execution — starting slow tests early ensures they don't become bottlenecks at the end.

This file is automatically updated after each test run. Commit it to share timing data across the team.

## Test Directory Structure

```
tests/
├── helpers/
│   ├── test-config.ts   # Port and database allocation
│   ├── server.ts        # Test server lifecycle
│   ├── auth.ts          # Authentication helpers
│   └── logger.ts        # Test logger
├── server/
│   ├── auth/            # Authentication tests
│   └── graphql/         # GraphQL API tests
├── setup.ts             # Global test setup
└── test-run-order.json  # Duration tracking
```

## Critical Requirement: Import Order

All test files **must** import `@tests/helpers/test-config` as their first import:

```typescript
import "@tests/helpers/test-config"  // Must be first!

import { beforeAll, afterAll, test, expect } from 'bun:test'
import { startTestServer } from '../helpers/server'
```

This import sets `PORT`, `DATABASE_URL`, and `API_URL` environment variables before `serverConfig` caches them at module load time. Importing it after other server modules causes tests to use the wrong port or database.

## Running Tests

```shell
bun run test                    # Run all tests
bun run test --pattern auth     # Run matching tests
bun run test --watch            # Watch mode
bun run test --verbose          # Enable debug logging
bun run test --bail             # Stop on first failure
bun run test -c 4               # Set concurrency level
bun run test -f auth.test.ts    # Run specific file
```

## Writing Tests

```typescript
import "@tests/helpers/test-config"

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

test('health check returns ok', async () => {
  const response = await fetch(`${testServer.url}/health`)
  const data = await response.json()
  expect(data.status).toBe('ok')
})
```

