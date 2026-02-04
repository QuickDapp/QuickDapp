---
order: 40
---

# Test E2E

QuickDapp includes end-to-end browser testing powered by [Playwright](https://playwright.dev/).

## Running Tests

```shell
bun run test:e2e              # Run headless browser tests
bun run test:e2e --headed     # Run with visible browser window
bun run test:e2e --ui         # Open Playwright's interactive UI mode
```

## What Happens

The E2E test runner:

1. Starts a test database container via Docker Compose (locally)
2. Pushes the database schema with `bun run db push --force`
3. Starts the dev server as a background process
4. Runs Playwright tests against the running application
5. Reports results

## Configuration

The Playwright configuration lives in [`playwright.config.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/playwright.config.ts):

- **Test directory**: `./tests/e2e`
- **Base URL**: `http://localhost:5173` (Vite dev server)
- **Browser**: Chromium (Desktop Chrome)
- **Parallel**: Disabled (tests run sequentially)
- **Web server**: Automatically starts the dev server and waits for it

## Writing E2E Tests

E2E tests go in the `tests/e2e/` directory:

```typescript
import { test, expect } from "@playwright/test"

test("homepage loads", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveTitle(/QuickDapp/)
})

test("can navigate to login", async ({ page }) => {
  await page.goto("/")
  await page.click("text=Sign In")
  await expect(page.locator("form")).toBeVisible()
})
```

## CI vs Local

In CI environments (`CI=true`):
- The test database is provided by a service container
- Tests retry failed tests up to 2 times
- `--forbidOnly` prevents `.only` from passing in CI

Locally:
- Docker Compose starts a test database container
- No retries (fail fast for debugging)
- Can reuse an existing dev server

See [`scripts/test-e2e.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/scripts/test-e2e.ts) for the test runner implementation and [`playwright.config.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/playwright.config.ts) for the full configuration.
