---
order: 60
---

# test

The test command provides a comprehensive test runner for QuickDapp's integration test suite. 

```shell
bun run test
```

This command:
- Sets up the test database by generating and applying migrations
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

### Serial Execution Flag

Run tests serially:
```shell
bun run test --serial
```

Note: Tests already run in isolation and serially by design; this flag is currently redundant.

