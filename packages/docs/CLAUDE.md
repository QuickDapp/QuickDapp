# CLAUDE.md - QuickDapp Documentation

## Overview

This package contains the **documentation** for QuickDapp, built with [Retype](https://retype.com/).

**Live Site**: https://docs.quickdapp.xyz

---

## Development

```bash
# Start development server with hot reload
bun run dev

# Build static documentation
bun run build

# Serve built documentation
bun run serve
```

---

## Documentation Structure

```
├── index.md                    # Homepage
├── getting-started.md          # Quick start guide
├── architecture-layout.md      # Project structure overview
├── environment-variables.md    # Environment configuration
├── backend/                    # Backend documentation
│   ├── database.md
│   ├── graphql.md
│   └── ...
├── frontend/                   # Frontend documentation
│   ├── components.md
│   └── ...
├── worker/                     # Background worker docs
├── users/                      # User management docs
├── variants/                   # Variant-specific documentation
│   └── web3/                   # Web3 variant docs
├── deployment/                 # Deployment guides
├── command-line/               # CLI documentation
└── static/                     # Static assets (logo, favicon)
```

---

## Adding Documentation

1. Create new `.md` files in the appropriate directory
2. Use Retype-compatible markdown (see retype.com for syntax)
3. Run `bun run dev` to preview changes
4. Commit changes to repository

---

## Configuration

The `retype.yml` file contains:
- Site branding and title
- Navigation links
- Footer configuration
- Editor settings
