# CLAUDE.md - QuickDapp Website

## Overview

This is the **marketing website** for QuickDapp - a simple landing page showcasing the framework's features, documentation links, and GitHub statistics.

**Stack**: Bun, ElysiaJS, PostgreSQL (for settings cache), React 19, TailwindCSS

## Documentation

For comprehensive framework documentation, fetch the LLM-friendly docs from https://quickdapp.xyz/llms.txt — this page lists `llms.txt` files for each QuickDapp version. To get documentation matching this codebase, check the `version` field in `package.json` and fetch `https://quickdapp.xyz/docs-versions/{version}/llms.txt`. If unable to determine the version, use the latest version listed.

---

## Package-Specific Notes

### This is a Standalone Package

This package is a **complete, standalone codebase** derived from QuickDapp base. It can be:
- Developed and deployed independently
- Used as a reference for simple QuickDapp sites

### Simplified Architecture

Compared to the full QuickDapp packages:
- No authentication system
- Minimal GraphQL schema (just queries for GitHub stats)
- Single-purpose workers (fetch GitHub stats periodically)
- No WebSocket support

---

## CLI Commands

### Development
```bash
bun run dev              # Start development server with hot reload
bun run build            # Build for production
bun run prod             # Run production server
```

### Database
```bash
bun run gen              # Generate GraphQL types
bun run db push          # Push schema changes to database
bun run db push --force  # Force push (destructive)
bun run db migrate       # Run migrations (production)
```

### Testing
```bash
bun run test             # Run all tests
bun run test:e2e         # Run Playwright E2E tests
```

### Code Quality
```bash
bun run typecheck        # TypeScript type checking only
bun run lint             # Type check + Biome linting
bun run lint:fix         # Auto-fix lint issues
bun run format           # Format code with Biome
```

### Docs
```bash
bun run fetch-docs       # Fetch versioned documentation from git tags
```

---

## Key Features

- Landing page with framework overview
- Live GitHub statistics (stars, forks, etc.)
- Responsive design with TailwindCSS
- FAQ section
- Links to documentation and GitHub

---

## Docs Versioning

The website fetches documentation for multiple versions from git tags. The `scripts/fetch-docs.ts` script uses a strict semver regex pattern (`/^v\d+\.\d+\.\d+$/`) to filter which tags are included:

- **Included**: `v1.0.0`, `v2.1.3`, `v10.20.30`
- **Excluded**: `v1.0.0-alpha`, `v1.0.0-rc.1`, `v1.0.0-beta.2`

Only strict `vX.Y.Z` format tags appear in the docs version selector. Pre-release tags are intentionally excluded.

---

## Environment Variables

Required:
```
DATABASE_URL=postgres://user:pass@host:port/db
API_URL=http://localhost:3000
```

Optional:
```
GITHUB_TOKEN=<for higher API rate limits>
```

---

## Coding Guidelines

**Custom Components over Native HTML**
- Use custom components from `src/client/components/` instead of native HTML elements
- `Button` component instead of `<button>` - provides consistent styling and variants
- `Dialog` component instead of `<dialog>` - accessible modal implementation
- `Sheet` component for slide-out panels
- Check existing components before using native HTML tags - consistency matters
