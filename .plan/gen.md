# Plan: Create Combined `gen` CLI Command

## Overview

Create a new `bun run gen` command that combines:
1. **GraphQL/ABI type generation** (currently `bun run codegen`)
2. **Database migration generation** (currently `bun run db generate`)

This consolidates two frequently-used commands into one, simplifying the development workflow.

## Current State

| Command | Script | Description |
|---------|--------|-------------|
| `bun run codegen` | `scripts/codegen.ts` | Generates GraphQL types + ABI types |
| `bun run codegen:watch` | `scripts/codegen.ts --watch` | Watch mode for codegen |
| `bun run db generate` | `scripts/db.ts generate` | Generates drizzle-kit migrations |

## Target State

| Command | Script | Description |
|---------|--------|-------------|
| `bun run gen` | `scripts/gen.ts` | Combined codegen + db generate |
| `bun run db generate` | `scripts/db.ts generate` | Still available (logic reused) |

**Removed:**
- `bun run codegen`
- `bun run codegen:watch`

---

## Implementation Tasks

### 1. Create `scripts/gen.ts`

**Path:** `scripts/gen.ts`

```typescript
#!/usr/bin/env bun

import { generateTypes } from "./shared/generate-types"
import { runDbGenerate } from "./db"
import { createScriptRunner, type ScriptOptions } from "./shared/script-runner"

async function genHandler(
  options: ScriptOptions,
  _config: { rootFolder: string; env: string },
) {
  console.log("🚀 Running code generation...")
  console.log("")

  // Step 1: GraphQL + ABI types
  console.log("📝 Step 1: Generating types (GraphQL + ABI)...")
  await generateTypes({ verbose: options.verbose || false })
  console.log("✅ Types generated")
  console.log("")

  // Step 2: Database migrations
  console.log("🗄️  Step 2: Generating database migrations...")
  await runDbGenerate({ verbose: options.verbose || false })
  console.log("")

  console.log("✨ Code generation complete!")
}

createScriptRunner(
  {
    name: "Gen",
    description: "Generate types (GraphQL, ABI) and database migrations",
    env: "development",
  },
  genHandler,
)
```

---

### 2. Modify `scripts/db.ts`

**Path:** `scripts/db.ts`

Export the generate functionality for reuse:

```typescript
// Add export for the drizzle command runner
export async function runDrizzleCommand(args: string[]): Promise<void> {
  // ... existing implementation
}

// Add export for generate handler
export async function runDbGenerate(options: { verbose?: boolean } = {}): Promise<void> {
  if (options.verbose) {
    console.log("🔧 Generating DrizzleORM migrations...")
  }
  try {
    await runDrizzleCommand(["generate"])
    console.log("✅ Migrations generated successfully")
  } catch (error) {
    console.error("❌ Failed to generate migrations:", error)
    throw error  // Re-throw instead of process.exit for reuse
  }
}
```

**Changes:**
1. Export `runDrizzleCommand` function
2. Create and export `runDbGenerate` function
3. Update `generateHandler` to use `runDbGenerate` internally
4. Change `process.exit(1)` to `throw error` in exported functions

---

### 3. Delete `scripts/codegen.ts`

**Path:** `scripts/codegen.ts`

Remove entirely - functionality is now in `gen` command.

---

### 4. Update `package.json`

**Path:** `package.json`

```diff
  "scripts": {
    "dev": "bun run scripts/dev.ts",
    "build": "bun run scripts/build.ts",
    "prod": "bun run scripts/prod.ts",
    "test": "bun run scripts/test.ts",
    "typecheck": "tsc --noEmit",
    "lint": "bun run typecheck && biome check .",
    "lint:fix": "bun run typecheck && biome check --write .",
    "format": "biome format --write .",
-   "codegen": "bun run scripts/codegen.ts",
-   "codegen:watch": "bun run scripts/codegen.ts --watch",
+   "gen": "bun run scripts/gen.ts",
    "db": "bun run scripts/db.ts",
    "showdocs": "retype start ./docs"
  }
```

---

## Documentation Updates

### 5. Update `CLAUDE.md`

**Path:** `CLAUDE.md`

**Section: Core Commands > Database**

```diff
  ### Database
  ```bash
- bun run db:generate    # Generate DrizzleORM migrations from schema changes
+ bun run gen            # Generate types (GraphQL, ABI) and database migrations
  bun run db:push        # Push schema changes to database (development/test)
  bun run db:migrate     # Run migrations (production)
  ```
```

**Section: Common Development Tasks > Adding New Database Tables**

```diff
  ### Adding New Database Tables
  1. Update `src/server/db/schema.ts` with new table definition
- 2. Run `bun run db:generate` to create migration
+ 2. Run `bun run gen` to create migration (also regenerates types)
  3. Run `bun run db:push` to apply to development database
  4. Update test helpers in `tests/helpers/database.ts` if needed
```

---

### 6. Update `docs/command-line/index.md`

**Path:** `docs/command-line/index.md`

**Add gen command:**

```markdown
#### `bun run gen`
Generates all code artifacts:

```shell
bun run gen
```

This command:
* Generates GraphQL TypeScript types from schema
* Generates ABI types from contract artifacts (if configured)
* Creates DrizzleORM migration files from schema changes
```

**Update command reference table:**

```diff
  | Command | Description | Environment |
  |---------|-------------|-------------|
  | `bun run dev` | Development server | Development |
  | `bun run build` | Production build | Any |
  | `bun run prod` | Production server | Production |
  | `bun run test` | Test runner | Test |
+ | `bun run gen` | Generate types + migrations | Development |
  | `bun run lint` | Type check + lint | Any |
  | `bun run lint:fix` | Fix linting issues | Any |
  | `bun run format` | Format code | Any |
  | `bun run db push` | Push schema changes | Development |
  | `bun run db generate` | Generate migrations | Any |
  | `bun run db migrate` | Run migrations | Production |
```

---

### 7. Update `docs/command-line/db.md`

**Path:** `docs/command-line/db.md`

**Update Development Workflow section:**

```diff
  ## Development Workflow

  ### Local Development

  For rapid development iteration:

  ```shell
  # 1. Modify schema in src/server/db/schema.ts
- # 2. Push changes directly to development database
+ # 2. Generate migrations and types
+ bun run gen
+
+ # 3. Push changes to development database
  bun run db push

- # 3. Test your changes
+ # 4. Test your changes
  bun run dev
  ```

  ### Preparing for Production

  Before deploying schema changes:

  ```shell
- # 1. Generate migration files
- bun run db generate
+ # 1. Generate migration files and types
+ bun run gen

  # 2. Review generated SQL files in drizzle/ directory
  # 3. Commit migration files to version control
  # 4. Deploy migrations in production
  ```
```

---

### 8. Update `docs/command-line/dev.md`

**Path:** `docs/command-line/dev.md`

**Update Database Development section:**

```diff
  ### Database Development

  Work with database changes during development:

  ```shell
+ # Generate types and migrations after schema changes
+ bun run gen

  # Apply schema changes to development database
  bun run db push

- # Generate migration for schema changes
- bun run db generate
-
  # Reset development database (destructive)
  bun run db push --force
  ```
```

---

### 9. Update `docs/backend/database.md`

**Path:** `docs/backend/database.md`

**Update Schema Migrations > Generating Migrations section:**

```diff
  ## Schema Migrations

  ### Generating Migrations

  When you modify the schema, generate a migration:

  ```shell
- # Generate migration from schema changes
- bun run db generate
+ # Generate types and migration from schema changes
+ bun run gen

  # This creates a new migration file in src/server/db/migrations/
  ```
+
+ Alternatively, to generate only migrations without type generation:
+
+ ```shell
+ bun run db generate
+ ```
```

---

### 10. Update `README.md`

**Path:** `README.md`

**Update Available Scripts section:**

```diff
  ### Available Scripts

  ```bash
  # Development
  bun run dev            # Start development server with hot reload
  bun run build          # Build for production

  # Database
- bun run db generate    # Generate DrizzleORM migrations
+ bun run gen            # Generate types and database migrations
  bun run db push        # Push schema changes to database
  bun run db migrate     # Run migrations (production)
```

---

## Test Implementation

### 11. Create `tests/scripts/gen.test.ts`

**Path:** `tests/scripts/gen.test.ts`

```typescript
import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { $ } from "bun"
import { existsSync } from "fs"
import path from "path"

const ROOT = path.join(import.meta.dir, "../..")

describe("CLI: gen command", () => {
  describe("basic execution", () => {
    it("should run successfully", async () => {
      const result = await $`bun run gen`.cwd(ROOT).nothrow()
      expect(result.exitCode).toBe(0)
    })

    it("should display progress messages", async () => {
      const result = await $`bun run gen`.cwd(ROOT).nothrow()
      const output = result.stdout.toString()

      expect(output).toContain("Running code generation")
      expect(output).toContain("Generating types")
      expect(output).toContain("Generating database migrations")
      expect(output).toContain("Code generation complete")
    })

    it("should support --verbose flag", async () => {
      const result = await $`bun run gen --verbose`.cwd(ROOT).nothrow()
      expect(result.exitCode).toBe(0)
    })
  })

  describe("generated files", () => {
    it("should generate GraphQL types", async () => {
      await $`bun run gen`.cwd(ROOT).nothrow()

      const typesPath = path.join(ROOT, "src/shared/graphql/generated.ts")
      expect(existsSync(typesPath)).toBe(true)
    })
  })

  describe("help output", () => {
    it("should display help with -h flag", async () => {
      const result = await $`bun run gen -h`.cwd(ROOT).nothrow()
      const output = result.stdout.toString()

      expect(output).toContain("Generate types")
      expect(output).toContain("--verbose")
    })
  })
})
```

---

### 12. Create `tests/scripts/db.test.ts`

**Path:** `tests/scripts/db.test.ts`

```typescript
import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { $ } from "bun"
import path from "path"

const ROOT = path.join(import.meta.dir, "../..")

describe("CLI: db command", () => {
  describe("db generate", () => {
    it("should run successfully", async () => {
      const result = await $`bun run db generate`.cwd(ROOT).nothrow()
      expect(result.exitCode).toBe(0)
    })

    it("should display progress messages", async () => {
      const result = await $`bun run db generate`.cwd(ROOT).nothrow()
      const output = result.stdout.toString()

      expect(output).toContain("Generating DrizzleORM migrations")
    })
  })

  describe("db push", () => {
    it("should run successfully with test database", async () => {
      const result = await $`NODE_ENV=test bun run db push`.cwd(ROOT).nothrow()
      expect(result.exitCode).toBe(0)
    })

    it("should support --force flag", async () => {
      const result = await $`NODE_ENV=test bun run db push --force`.cwd(ROOT).nothrow()
      expect(result.exitCode).toBe(0)
    })
  })

  describe("help output", () => {
    it("should display subcommand help", async () => {
      const result = await $`bun run db -h`.cwd(ROOT).nothrow()
      const output = result.stdout.toString()

      expect(output).toContain("generate")
      expect(output).toContain("migrate")
      expect(output).toContain("push")
    })
  })

  describe("error handling", () => {
    it("should handle unknown subcommand", async () => {
      const result = await $`bun run db unknown`.cwd(ROOT).nothrow()
      expect(result.exitCode).not.toBe(0)
    })
  })
})
```

---

### 13. Create `tests/scripts/script-runner.test.ts`

**Path:** `tests/scripts/script-runner.test.ts`

```typescript
import { describe, expect, it } from "bun:test"
import path from "path"

// Import the script runner module for unit testing
const SCRIPTS_DIR = path.join(import.meta.dir, "../../scripts/shared")

describe("Script Runner Utilities", () => {
  describe("bootstrap", () => {
    it("should export bootstrap function", async () => {
      const { bootstrap } = await import(`${SCRIPTS_DIR}/bootstrap.ts`)
      expect(typeof bootstrap).toBe("function")
    })

    it("should return rootFolder and env", async () => {
      const { bootstrap } = await import(`${SCRIPTS_DIR}/bootstrap.ts`)
      const result = await bootstrap({ env: "test" })

      expect(result.rootFolder).toBeDefined()
      expect(result.env).toBe("test")
      expect(result.parsedEnv).toBeDefined()
    })
  })

  describe("createScriptRunner", () => {
    it("should export createScriptRunner function", async () => {
      const { createScriptRunner } = await import(`${SCRIPTS_DIR}/script-runner.ts`)
      expect(typeof createScriptRunner).toBe("function")
    })
  })

  describe("generateTypes", () => {
    it("should export generateTypes function", async () => {
      const { generateTypes } = await import(`${SCRIPTS_DIR}/generate-types.ts`)
      expect(typeof generateTypes).toBe("function")
    })
  })
})
```

---

## File Summary

| Action | Path | Description |
|--------|------|-------------|
| Create | `scripts/gen.ts` | New combined generation command |
| Modify | `scripts/db.ts` | Export generate functions for reuse |
| Delete | `scripts/codegen.ts` | Remove (replaced by gen) |
| Modify | `package.json` | Update scripts |
| Modify | `CLAUDE.md` | Update command references |
| Modify | `docs/command-line/index.md` | Add gen, update table |
| Modify | `docs/command-line/db.md` | Update workflow sections |
| Modify | `docs/command-line/dev.md` | Update database section |
| Modify | `docs/backend/database.md` | Update migration section |
| Modify | `README.md` | Update available scripts |
| Create | `tests/scripts/gen.test.ts` | Tests for gen command |
| Create | `tests/scripts/db.test.ts` | Tests for db commands |
| Create | `tests/scripts/script-runner.test.ts` | Tests for shared utilities |

---

## Execution Order

1. Modify `scripts/db.ts` - Export functions
2. Create `scripts/gen.ts` - New command
3. Delete `scripts/codegen.ts` - Remove old
4. Update `package.json` - Update scripts
5. Create test files - All three test files
6. Run tests - Verify implementation
7. Update documentation - All doc files
8. Final verification - Run `bun run gen` and tests
