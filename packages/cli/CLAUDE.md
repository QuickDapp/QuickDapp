# CLAUDE.md - create-quickdapp CLI

## Overview

This is the **CLI tool** for scaffolding new QuickDapp projects. It downloads the latest release from GitHub and sets up a new project directory.

**Package Name**: `create-quickdapp` (published to npm)

---

## Usage

```bash
# Using bunx (recommended)
bunx @quickdapp/cli create my-project

# Using npx
npx @quickdapp/cli create my-project

# The 'create' command is the default, so this also works:
bunx @quickdapp/cli my-project

# With variant selection
bunx @quickdapp/cli create my-project --variant web3   # Web3 variant
bunx @quickdapp/cli create my-project --variant base   # Base (default)
```

---

## Development

```bash
# Build the CLI
bun run build

# Run locally during development
bun run dev create my-test-project
bun run dev my-test-project  # implicit create
```

---

## How It Works

1. Checks for Git and Bun prerequisites
2. Fetches the latest release version from GitHub
3. Downloads the appropriate tarball (base or web3 variant)
4. Extracts to the target directory
5. Initializes a git repository
6. Runs `bun install` (unless --skip-install)

---

## Release Process

This package is published to npm as part of the monorepo release process. The version is kept in sync with the main QuickDapp version.
