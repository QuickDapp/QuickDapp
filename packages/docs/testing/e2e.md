---
order: 50
---

# E2E Testing

QuickDapp includes end-to-end browser testing powered by [Playwright](https://playwright.dev/). E2E tests verify the full application stack from the user's perspective — clicking buttons, filling forms, and navigating pages.

## How the E2E Runner Works

The E2E test runner (`scripts/test-e2e.ts`) handles all the setup:

1. **Starts the test database** — Runs `docker compose -f docker-compose.test.yaml up` to start a PostgreSQL container (skipped in CI where the database is provided as a service)
2. **Pushes the schema** — Runs `bun run db push --force` to set up the database schema
3. **Starts the dev server** — Playwright's `webServer` config automatically starts the Vite dev server and waits for it
4. **Runs Playwright tests** — Executes tests in headless Chromium by default
5. **Reports results** — Outputs pass/fail status with detailed error information

## Running E2E Tests

```shell
bun run test:e2e              # Run headless browser tests
bun run test:e2e --headed     # Run with visible browser window
bun run test:e2e --ui         # Open Playwright's interactive UI mode
```

## Configuration

The Playwright configuration lives in `playwright.config.ts`:

| Setting | Value |
|---------|-------|
| Test directory | `./tests/e2e` |
| Base URL | `http://localhost:5173` |
| Browser | Chromium (Desktop Chrome) |
| Parallel | Disabled (tests run sequentially) |
| Web server | Automatically starts dev server |

Tests run sequentially to avoid complications with shared server state and database. For faster parallel execution, consider the integration test suite instead.

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

Playwright provides powerful selectors and assertions. See the [Playwright documentation](https://playwright.dev/docs/writing-tests) for details.

## CI vs Local

The test runner behaves differently based on environment:

| Behavior | Local | CI (`CI=true`) |
|----------|-------|----------------|
| Database | Docker Compose starts container | Service container provided |
| Retries | None (fail fast) | Up to 2 retries |
| `.only` | Allowed | Blocked (`--forbidOnly`) |

In CI, tests retry on failure to handle flaky browser interactions. Locally, failures stop immediately for faster debugging.

## Common Patterns

### Authenticated Tests

For tests that require login:

```typescript
import { test, expect } from "@playwright/test"

test("authenticated user can access dashboard", async ({ page }) => {
  // Navigate to login
  await page.goto("/login")

  // Fill login form
  await page.fill('input[name="email"]', "test@example.com")
  await page.fill('input[name="password"]', "password123")
  await page.click('button[type="submit"]')

  // Wait for redirect and verify dashboard
  await expect(page).toHaveURL(/dashboard/)
  await expect(page.locator("h1")).toContainText("Dashboard")
})
```

### Form Interactions

Testing form submission:

```typescript
test("can submit contact form", async ({ page }) => {
  await page.goto("/contact")

  await page.fill('input[name="name"]', "Test User")
  await page.fill('input[name="email"]', "test@example.com")
  await page.fill('textarea[name="message"]', "Hello!")
  await page.click('button[type="submit"]')

  await expect(page.locator(".success-message")).toBeVisible()
})
```

### Waiting for Network

When tests depend on API responses:

```typescript
test("loads user data", async ({ page }) => {
  await page.goto("/profile")

  // Wait for the GraphQL response
  await page.waitForResponse(
    (response) => response.url().includes("/graphql") && response.status() === 200
  )

  await expect(page.locator(".user-name")).toBeVisible()
})
```

## Debugging

Use Playwright's UI mode for interactive debugging:

```shell
bun run test:e2e --ui
```

This opens a visual interface where you can:
- Step through tests one action at a time
- See page snapshots at each step
- Inspect the DOM state
- View console logs and network requests

For headed mode with slower execution:

```shell
bun run test:e2e --headed
```

See [`playwright.config.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/playwright.config.ts) for the full configuration.
