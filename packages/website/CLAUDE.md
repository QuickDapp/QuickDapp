# CLAUDE.md - QuickDapp Website

## Overview

This is the **marketing website** for QuickDapp - a simple landing page showcasing the framework's features, documentation links, and GitHub statistics.

**Stack**: Bun, ElysiaJS, PostgreSQL (for settings cache), React 19, TailwindCSS

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

```bash
bun run dev              # Start development server
bun run build            # Build for production
bun run prod             # Run production server
bun run test             # Run tests
bun run gen              # Generate GraphQL types
bun run db push          # Push schema changes to database
bun run lint             # Run Biome linter
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
