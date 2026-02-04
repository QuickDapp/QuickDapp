---
order: 45
---

# Lint & Format

QuickDapp uses [Biome](https://biomejs.dev/) for linting and formatting, and TypeScript's compiler for type checking.

## Commands

```shell
bun run lint             # Run type checking (tsc) + Biome linting
bun run lint:fix         # Auto-fix lint issues
bun run format           # Format code with Biome
bun run typecheck        # TypeScript type checking only
```

## What Each Command Does

**`bun run lint`** runs two checks:
1. TypeScript compiler (`tsc --noEmit`) to catch type errors
2. Biome linter to enforce code style rules

**`bun run lint:fix`** runs Biome with auto-fix enabled, resolving issues like import ordering, unused imports, and style violations automatically.

**`bun run format`** runs Biome's formatter to standardize code formatting (indentation, line breaks, trailing commas, etc.).

## Biome Configuration

The project uses a single `biome.json` in the root folder. Key settings include:

- 2-space indentation
- No semicolons
- Organized imports
- Linting rules for correctness and style

## Integration with Git

QuickDapp uses [husky](https://typicode.github.io/husky/) for git hooks. The pre-commit hook runs `lint:fix` and `format` on staged files to ensure committed code meets quality standards.

Commits follow the [conventional commits](https://www.conventionalcommits.org/) format, enforced by [commitlint](https://commitlint.js.org/).
