# Test Command

The test command provides a comprehensive test runner for QuickDapp's integration test suite. It handles database setup, server lifecycle management, and test isolation to ensure reliable and reproducible test results.

## Overview

```shell
bun run test [options]
```

The test command automatically:
- Sets up a clean test database before running
- Runs tests in isolation mode for reliability
- Manages server startup and shutdown
- Provides comprehensive logging and debugging options
- Cleans up temporary files after completion

## Basic Usage

### Run All Tests

```shell
bun run test
```

This command:
- Resets the test database with `bun run db push --force`
- Discovers all `*.test.ts` files in the `tests/` directory
- Runs each test file in isolation
- Reports comprehensive results

### Verbose Output

```shell
bun run test --verbose
```

Enables debug logging by creating a temporary `.env.test.local` file with:
```bash
LOG_LEVEL=debug
WORKER_LOG_LEVEL=debug
```

The file is automatically cleaned up after test completion.

## Test Options

### Pattern Matching

Run tests matching a specific pattern:

```shell
# Run authentication tests
bun run test --pattern auth

# Run GraphQL tests  
bun run test --pattern graphql

# Run user-related tests
bun run test --pattern user
```

### Specific Test File

Run a single test file:

```shell
bun run test --test-file tests/integration/auth.test.ts
```

### Timeout Configuration

Set custom timeout for long-running tests:

```shell
# Set 60-second timeout
bun run test --timeout 60000

# Default timeout is 30 seconds
```

### Fail Fast Mode

Stop on first test failure:

```shell
bun run test --bail
```

Useful for:
- Quick feedback during development
- Identifying critical test failures
- Debugging test dependencies

### Watch Mode

Run tests in watch mode (planned feature):

```shell
bun run test --watch
```

*Note: Watch mode is available as an option but may not be fully implemented.*

## Test Architecture

### Database Isolation

Each test run gets a completely fresh database:

```
1. Clean test database schema with --force
2. Run test file in isolation
3. Database state is preserved between tests within same file
4. Next test file gets fresh database reset
```

### Process Isolation

Tests run in separate processes for maximum isolation:

```typescript
// Each test file runs as:
bun test ./tests/integration/auth.test.ts --concurrency 1
```

**Benefits:**
- No test interference
- Clean server state
- Reliable resource cleanup
- Predictable test environment

### Environment Setup

Test environment is automatically configured:

```bash
NODE_ENV=test  # Force test environment
# All other env vars inherited from process
```

## Test Structure

### Directory Layout

```
tests/
├── integration/           # Integration tests
│   ├── auth.test.ts      # Authentication tests
│   ├── graphql/          # GraphQL operation tests
│   └── workers.test.ts   # Background job tests
├── helpers/              # Test utilities
│   ├── server.ts        # Server lifecycle management
│   ├── database.ts      # Database test helpers
│   └── auth.ts          # Authentication test helpers
└── fixtures/             # Test data and mocks
```

### Test File Example

```typescript
// tests/integration/auth.test.ts
import { beforeAll, afterAll, test, expect } from 'bun:test'
import { startTestServer, stopTestServer } from '../helpers/server'

let testServer: any

beforeAll(async () => {
  testServer = await startTestServer()
})

afterAll(async () => {
  await stopTestServer(testServer)
})

test('user can authenticate with wallet', async () => {
  // Test implementation
})
```

## Test Execution Flow

### Setup Phase

```
1. Create temporary debug logging config (if --verbose)
2. Reset test database schema
3. Discover test files matching criteria
4. Display execution plan
```

### Execution Phase

```
For each test file:
1. Run in separate bun process
2. Set NODE_ENV=test
3. Apply timeout settings
4. Run with concurrency=1 (serial)
5. Capture exit code and output
```

### Results Phase

```
1. Count passed/failed tests
2. Display summary statistics
3. List failed files if any
4. Clean up temporary files
5. Exit with appropriate code
```

## Database Management

### Test Database Setup

Before each test run:

```shell
# Automatically executed
bun run db push --force
```

This command:
- Drops all existing tables
- Recreates schema from `src/server/db/schema.ts`
- Resets all sequences
- Provides clean slate for tests

### Test Data Management

Test helpers provide database utilities:

```typescript
// Example test helpers
import { setupTestDatabase, cleanTestDatabase } from '../helpers/database'

beforeAll(async () => {
  await setupTestDatabase()
})

afterAll(async () => {
  await cleanTestDatabase()
})
```

## Debugging Tests

### Debug Logging

Enable comprehensive logging:

```shell
bun run test --verbose
```

This creates temporary configuration:
```bash
# .env.test.local (auto-created and cleaned)
LOG_LEVEL=debug
WORKER_LOG_LEVEL=debug
```

### Manual Debug Configuration

Create persistent debug configuration:

```shell
# Create debug config
echo "LOG_LEVEL=debug" > .env.test.local
echo "WORKER_LOG_LEVEL=debug" >> .env.test.local

# Run tests
bun run test

# Clean up when done
rm .env.test.local
```

### Individual Test Debugging

Run specific test with maximum verbosity:

```shell
bun run test \
  --test-file tests/integration/auth.test.ts \
  --verbose \
  --timeout 60000
```

## Performance Optimization

### Serial Execution

Tests always run in serial mode:
- Prevents database conflicts
- Ensures resource availability
- Provides predictable execution order

### Database Performance

Test database optimizations:
- Connection pooling disabled in tests
- Reduced worker processes
- Simplified logging configuration

## Error Handling

### Database Setup Failures

If database setup fails:

```
❌ Failed to set up test database: <error>
Process exits with code 1
```

**Common solutions:**
- Ensure PostgreSQL is running
- Check DATABASE_URL in test environment
- Verify database permissions

### Test Execution Failures

Individual test failures are captured and reported:

```
📊 Test Summary:
   Passed: 5
   Failed: 2
   Failed files:
   - tests/integration/auth.test.ts
   - tests/integration/workers.test.ts
```

### Cleanup on Interruption

Graceful cleanup on Ctrl+C or process termination:
- Removes temporary `.env.test.local`
- Stops any running test processes
- Exits cleanly

## Integration with Development

### Pre-commit Testing

Run tests before committing:

```shell
# Quick test run
bun run test --bail

# Full test suite
bun run test
```

### Continuous Integration

Test command is CI-friendly:
- Proper exit codes (0 for success, 1 for failure)
- Clear output formatting
- Automatic cleanup
- Environment detection

## Advanced Usage

### Custom Test Patterns

```shell
# Test specific feature areas
bun run test --pattern notification
bun run test --pattern websocket
bun run test --pattern blockchain

# Test specific layers
bun run test --pattern graphql
bun run test --pattern database
bun run test --pattern worker
```

### Performance Testing

```shell
# Run with extended timeout for performance tests
bun run test --pattern performance --timeout 120000
```

### Smoke Testing

```shell
# Quick verification tests
bun run test --pattern smoke --bail
```

The test command provides a robust foundation for maintaining QuickDapp's quality through comprehensive integration testing with proper isolation, cleanup, and debugging capabilities.