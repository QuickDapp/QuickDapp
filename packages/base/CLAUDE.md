# CLAUDE.md

## Overview

QuickDapp Base is an opinionated modern web application boilerplate. It provides pre-integrated authentication (email/OAuth), database, background workers, and GraphQL API.

**Core Stack**: Bun, ElysiaJS, PostgreSQL/DrizzleORM, GraphQL Yoga, React 19

This is the base package - the foundation for QuickDapp projects without Web3 features.

## Documentation

For comprehensive framework documentation, fetch the LLM-friendly docs from https://quickdapp.xyz/llms.txt — this page lists `llms.txt` files for each QuickDapp version. To get documentation matching this codebase, check the `version` field in `package.json` and fetch `https://quickdapp.xyz/docs-versions/{version}/llms.txt`. If unable to determine the version, use the latest version listed.

---

## CLI Commands

### Development
```bash
bun run dev              # Start development server with hot reload
bun run dev --verbose    # Detailed startup logging
bun run build            # Build for production
bun run prod             # Run production server (serves API and client)
bun run prod server      # Server only
bun run prod client      # Client preview only
```

### Database
```bash
bun run gen              # Generate types (GraphQL) and database migrations
bun run db push          # Push schema changes to database (development/test)
bun run db push --force  # Force push (destructive)
bun run db migrate       # Run migrations (production)
```

### Testing
```bash
bun run test                    # Run all tests
bun run test --pattern <name>   # Run specific test pattern
bun run test --watch            # Run tests in watch mode
bun run test:e2e                # Run Playwright E2E tests
bun run test:e2e --headed       # E2E with visible browser
bun run test:e2e --ui           # E2E with Playwright UI mode
```

### Code Quality
```bash
bun run typecheck        # TypeScript type checking only
bun run lint             # Type check + Biome linting
bun run lint:fix         # Auto-fix lint issues
bun run format           # Format code with Biome
```

---

## Coding Guidelines

### 1. Code Style & Patterns

**General Principles**
- Keep codebase clean with high-cohesion, low-coupling, and good separation of concerns
- Use enums and constants instead of hardcoded strings/numbers (define in `src/shared/constants.ts`)
- Avoid files over 300 lines - refactor at that point
- Method names camelCased, enums UpperCased, file names camelCased
- No stubbing or fake data patterns - prompt instead
- Only make requested changes unless very confident about related changes
- Static imports only - no `await import()` in non-test code
- Remove old/unused code and files immediately
- Don't introduce new patterns/technologies without exhausting existing options

**TypeScript**
- Use TypeScript throughout the codebase, including scripts
- Strongly type all data structures (allow `any` but prefer exact types)
- Omit semicolons where possible
- Prefer `for of` over `forEach`
- 2-space indentation
- Imports/requires at top of file, not inline in methods

**Comments**
- Comments describe what the code does, not what changed
- Avoid hardcoded values in comments - describe behavior conceptually
- Don't add comments like "New Import" after newly inserted imports

---

### 2. Database & GraphQL

**Database (DrizzleORM)**
- Use DrizzleORM query builder, not raw SQL
- Use transactions for multi-access operations via `withTransaction()`
- NO `FOR UPDATE` locking - rely on serializable isolation instead
- Define fixed string columns as enums in `src/shared/constants.ts`
- Never modify generated migration files after creation
- Schema defined in `src/server/db/schema.ts`

**GraphQL**
- Schema-first approach with `@auth` directive for protected fields
- Never use field resolvers - fetch all data via SQL joins to avoid N+1 queries
- Define reusable fragments in `src/shared/graphql/fragments.ts`
- All queries/mutations MUST use defined fragments for response types
- Queries in `src/shared/graphql/queries.ts`, mutations in `mutations.ts`
- Use GraphQL for all server APIs - no separate REST endpoints

---

### 3. Frontend (React)

- Always use TypeScript for React apps
- Use `useCallback()` and `useMemo()` for memoization where possible
- Don't use `React.memo()` automatically - manual decision only
- Component filename matches component name, ends in `.tsx`
- Named exports only (no default exports)
- Props as exported TypeScript interface
- Contexts in own file with `use...Context` hook exported
- Use `PropsWithClassname` type for className props (never manually add `className?: string`)
- Use `cn()` utility for dynamic className content - no template string interpolation
- Client code uses `clientConfig` from `src/shared/config/client.ts` - never access `globalThis.__CONFIG__` directly

**Custom Components over Native HTML**
- Use custom components from `src/client/components/` instead of native HTML elements
- `Button` component instead of `<button>` - provides consistent styling and variants
- `Dialog` component instead of `<dialog>` - accessible modal implementation
- `Sheet` component for slide-out panels
- Check existing components before using native HTML tags - consistency matters

**Static Assets**
- Any file needed as a static asset at runtime goes in `src/server/static-src/`
- Vite serves these during dev (via publicDir) and copies to build output
- Never edit `src/server/static/` directly - it's auto-populated from `static-src/` on build
- For assets in React components, use Vite imports (they get optimized and hashed)

---

### 4. Testing & Debugging

**Testing**
- Prefer integration tests over unit tests for server-side functionality
- ALWAYS use `bun run test` command - never run tests directly with `bun test`
- Use `serverConfig` not `process.env` in tests
- Replace `console.log` with logger instances (category: `test-logger`) from `src/server/lib/logger.ts`
- For remote APIs, simulate with local dummy servers for automation
- When starting test servers, ensure they inherit `process.env` since `NODE_ENV` will be `test`
- Always think about adding/updating/removing tests after making changes

**Test Parallelization**

Tests run in parallel with each test file getting isolated resources.

**Critical Requirement:** All test files MUST import `@tests/helpers/test-config` as their FIRST import (before any server modules):

```typescript
// Side-effect import: sets env vars before serverConfig loads
import "@tests/helpers/test-config"

import { describe, expect, it } from "bun:test"
// ... other imports
```

**Why this matters:** `serverConfig` caches environment variables at module load time. The test-config import sets PORT, DATABASE_URL, and API_URL before serverConfig is imported by any other module.

**Resource Allocation:**
- Server ports: 54000 + test file index
- Database names: `quickdapp_test_{index}`

**Template Database Pattern:**

The test runner creates a template database (`quickdapp_test`) with schema pushed, then each parallel test file clones it:
1. `scripts/test.ts` runs `db push` on `quickdapp_test`
2. Marks it as a PostgreSQL template
3. Each test file creates `quickdapp_test_{index}` from template
4. After tests, each clone is dropped

**Dynamic Port Assignment for Test Servers:**

Any server started during tests must use dynamic port assignment:

```typescript
import { getTestPort } from "@tests/helpers/test-config"

const port = await getTestPort()  // Returns unique port for this test file
```

See `tests/helpers/server.ts` for the `startTestServer()` pattern.

**Test Ordering:**

`tests/test-run-order.json` tracks test file durations. The test runner orders tests by duration (longest first) for optimal parallel execution. This file is auto-updated after each test run.

**Worker Process Cleanup:**

`tests/setup.ts` calls `killAllActiveWorkers()` in `afterAll` to ensure spawned worker processes don't leak between test files.

**Debugging**
- Use `bun run dev --verbose` for detailed startup logging
- Create temporary `.env.test.local` with `LOG_LEVEL=debug` and `WORKER_LOG_LEVEL=debug` for test debugging
- Remove debug config files once issues resolved
- If 2-3 debug attempts fail, add detailed logging instead of guessing

---

### 5. Code Quality

- Never leave unused variables in the code
- Don't use deprecated methods from third-party packages
- Preserve existing logging calls when updating code
- After changes: check for redundant code and refactoring opportunities
- If same logic appears multiple places, refactor to reuse
- Don't proactively create markdown/README files unless requested
- Don't make code changes for "better UX" unless explicitly asked
- Think about what other code might be affected by changes
- Don't touch code unrelated to the task

---

### 6. Tooling & Environment

**Environment**
- Never overwrite `.env*` files without asking first
- Ensure build output, node_modules, and generated files are in `.gitignore`
- Never use `process.env` in backend or tests - always use `serverConfig`
- Client uses `clientConfig`, server uses `serverConfig`
- Environment layers: `.env` (base) → `.env.{NODE_ENV}` (overrides) → `.env.local` (developer, gitignored)

**Bun & Biome**
- Use `bun` for package management
- Use `bunx` instead of `npx` for NPM executables
- Use `bun run` instead of `npm run`
- Single `biome.json` in root folder for entire codebase
- Code formatted on file-save
- Run `bun run lint:fix` and `bun run format` before commits

**Git**
- Use husky conventional commits
- No shebang lines at top of husky scripts
- Don't stop/restart PostgreSQL without asking first
