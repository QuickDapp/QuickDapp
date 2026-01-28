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
