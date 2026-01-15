# QuickDapp Monorepo Refactor Plan

## Overview

Convert QuickDapp from a single project into a Bun-based monorepo with separate packages for core functionality, Web3 variant, CLI tooling, documentation, and marketing website.

## Target Structure

```
quickdapp/
├── package.json                    # Root workspace config + release scripts
├── bun.lock                        # Shared lockfile
├── CLAUDE.md                       # Monorepo-level instructions
├── .versionrc.json                 # commit-and-tag-version config
├── CHANGELOG.md                    # Generated changelog
├── scripts/
│   └── release.ts                  # Release automation script
│
├── packages/
│   ├── base/                       # Base QuickDapp (no Web3) - standalone
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── biome.json
│   │   ├── docker-compose.yaml
│   │   ├── docker-compose.test.yaml
│   │   ├── scripts/
│   │   ├── CLAUDE.md
│   │   └── src/
│   │
│   ├── variant-web3/               # Web3 variant - standalone derivation of base
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── biome.json
│   │   ├── docker-compose.yaml
│   │   ├── docker-compose.test.yaml
│   │   ├── scripts/
│   │   ├── CLAUDE.md
│   │   └── src/
│   │
│   ├── website/                    # Marketing website - standalone derivation of base
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── biome.json
│   │   ├── docker-compose.yaml
│   │   ├── docker-compose.test.yaml
│   │   ├── scripts/
│   │   └── src/
│   │
│   ├── cli/                        # create-quickdapp CLI (published to npm)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │
│   └── docs/                       # Documentation (Retype)
│       ├── package.json
│       ├── retype.yml
│       └── *.md
│
└── .github/
    └── workflows/
        ├── ci.yml
        ├── docker-base.yml
        ├── docker-web3.yml
        └── release.yml
```

**Note**: base, variant-web3, and website are NOT traditional monorepo packages with interdependencies. They are independent, standalone codebases. Variants and website are **derivations** of base code - they started as copies and diverge as needed.

---

## Package Details

### 1. packages/base

**Purpose**: Core QuickDapp framework with ALL Web3/blockchain code removed

**Key Changes from Current Codebase**:
- Remove `WEB3_ENABLED` config flag entirely
- Remove all Web3 dependencies (viem, wagmi, rainbowkit, siwe)
- Remove all Web3-specific files (26 files total)
- Keep email/OAuth authentication via Arctic only
- Keep core workers (removeOldWorkerJobs only)

**Files to Remove**:
```
src/shared/contracts/          # All contract utilities
src/shared/abi/                # ABI codegen and data
src/server/lib/chains.ts       # Chain configuration
src/server/workers/chainFilters/
src/server/workers/jobs/watchChain.ts
src/server/workers/jobs/deployMulticall3.ts
src/client/config/web3.ts
src/client/components/ConnectWallet.tsx
src/client/components/IfWalletConnected.tsx
src/client/components/TokenList.tsx
src/client/components/SendTokenDialog.tsx
src/client/components/CreateTokenDialog.tsx
src/client/components/NumTokens.tsx
src/client/components/ContractValue.tsx
src/client/hooks/useTokens.ts
src/client/hooks/useTokenActions.ts
sample-contracts/
```

**Files to Modify**:
- `src/shared/config/client.ts` - Remove WEB3_* vars
- `src/shared/config/server.ts` - Remove WEB3_* vars
- `src/server/auth/index.ts` - Remove SIWE authentication
- `src/server/graphql/resolvers.ts` - Remove SIWE mutations
- `src/server/workers/index.ts` - Remove Web3 job scheduling
- `src/server/bootstrap.ts` - Remove blockchain client creation
- `src/client/App.tsx` - Remove Web3Providers wrapper
- `src/client/contexts/AuthContext.tsx` - Keep NonWeb3AuthProvider only

**package.json** (key deps):
```json
{
  "name": "@quickdapp/base",
  "private": true,
  "dependencies": {
    "elysia": "^1.3.8",
    "react": "^19.0.0",
    "drizzle-orm": "^0.44.4",
    "graphql-yoga": "^5.15.1",
    "arctic": "^3.7.0"
  }
}
```

---

### 2. packages/variant-web3

**Purpose**: Web3 variant - full copy of base with blockchain support added

**Approach**: Copy & Modify (full copy of base with Web3 additions)

**Key Characteristics**:
- Complete copy of base codebase
- NO WEB3_ENABLED flag (Web3 always enabled)
- Adds viem, wagmi, rainbowkit, siwe dependencies
- Has SIWE authentication built-in
- Has Web3 workers (watchChain, deployMulticall3)
- Has blockchain client creation in bootstrap
- App wrapped with Web3 providers

**What's Different from Base**:
- `src/shared/contracts/` - Contract utilities (added)
- `src/shared/abi/` - ABI codegen (added)
- `src/server/lib/chains.ts` - Chain configuration (added)
- `src/server/workers/chainFilters/` - Blockchain event filters (added)
- `src/server/workers/jobs/watchChain.ts` - Chain watching job (added)
- `src/server/workers/jobs/deployMulticall3.ts` - Multicall deployment (added)
- `src/client/config/web3.ts` - Web3 configuration (added)
- `src/client/components/ConnectWallet.tsx` - Wallet UI (added)
- `src/client/hooks/useTokens.ts`, `useTokenActions.ts` - Token hooks (added)
- `src/server/auth/index.ts` - Includes SIWE (modified)
- `src/client/App.tsx` - Wrapped with Web3 providers (modified)
- `src/client/contexts/AuthContext.tsx` - Uses Web3AuthProvider (modified)
- `sample-contracts/` - Hardhat project (added)

**package.json** (key deps):
```json
{
  "name": "@quickdapp/variant-web3",
  "private": true,
  "dependencies": {
    "elysia": "^1.3.8",
    "react": "^19.0.0",
    "drizzle-orm": "^0.44.4",
    "graphql-yoga": "^5.15.1",
    "arctic": "^3.7.0",
    "viem": "^2.38.4",
    "wagmi": "^2.16.5",
    "@rainbow-me/rainbowkit": "^2.2.8",
    "siwe": "^3.0.0"
  }
}
```

---

### 3. packages/cli

**Purpose**: CLI tool for scaffolding new QuickDapp projects

**Package Name**: `create-quickdapp` (published to npm)

**Usage**:
```bash
# Interactive mode (default)
npx create-quickdapp my-app
bunx create-quickdapp my-app

# Direct template selection
npx create-quickdapp my-app --template base
npx create-quickdapp my-dapp --template web3

# With options
npx create-quickdapp my-app --template base --skip-git
```

**CLI Flow**:
1. Parse CLI args (folder path required, optional --template, --skip-git)
2. Check for `git` and `bun` in PATH (exit with error if missing)
3. Check if target folder exists - if it does and contains files, error out
4. If --skip-git not passed: initialize git in folder (error if .git already exists)
5. Download latest release zip from GitHub:
   - Base: `https://github.com/QuickDapp/QuickDapp/releases/latest/download/base.zip`
   - Variant: `https://github.com/QuickDapp/QuickDapp/releases/latest/download/variant-{name}.zip`
6. Unzip into project folder
7. Run `bun install`
8. If --skip-git not passed: create initial git commit (conventional commit format)
9. Print success message with next steps

**Structure**:
```
packages/cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Entry point
│   ├── commands/
│   │   └── create.ts         # Main create command
│   └── utils/
│       ├── git.ts            # Git operations
│       ├── download.ts       # Download & unzip
│       ├── system.ts         # Check for git/bun
│       └── prompts.ts        # Interactive prompts
└── tests/
```

**package.json**:
```json
{
  "name": "create-quickdapp",
  "version": "1.0.0",
  "bin": {
    "create-quickdapp": "./dist/index.js"
  },
  "dependencies": {
    "commander": "^14.0.0",
    "prompts": "^2.4.2",
    "picocolors": "^1.1.0"
  }
}
```

---

### 4. packages/docs

**Purpose**: Documentation site using Retype

**Source**: Current `docs/` folder

**Changes**:
- Move to `packages/docs/`
- Update retype.yml for new structure
- Reorganize docs:
  - `/base/` - Base documentation
  - `/variants/web3/` - Web3 variant documentation
  - `/cli/` - CLI documentation
  - `/deployment/` - Deployment guides

**package.json**:
```json
{
  "name": "@quickdapp/docs",
  "private": true,
  "scripts": {
    "dev": "retype start",
    "build": "retype build"
  },
  "devDependencies": {
    "retypeapp": "^3.11.0"
  }
}
```

---

### 5. packages/website

**Purpose**: Marketing website for quickdapp.xyz

**Source**: `~/dev/quickdapp/website3` (already based on base patterns)

**Approach**: Copy & Modify (similar to variant-web3, but for marketing site)

**Stack**: ElysiaJS, React 19, PostgreSQL, GraphQL (same as base)

**Key Characteristics**:
- Based on base architecture patterns
- Simplified database schema (settings, worker_jobs only)
- Custom frontend pages (HomePage, FAQ, etc.)
- GitHub stats fetching worker
- No authentication system (public marketing site)
- No Web3 dependencies

**What's Different from Base**:
- `src/server/db/schema.ts` - Simplified schema (settings, worker_jobs only)
- `src/server/workers/jobs/fetchGithubSettings.ts` - GitHub API integration (added)
- `src/client/pages/HomePage.tsx` - Marketing content (replaced)
- `src/client/components/GithubStats.tsx` - Release info display (added)
- `src/client/components/FaqBlock.tsx` - FAQ section (added)
- Removed: authentication, user management, tokens, most resolvers

**package.json**:
```json
{
  "name": "@quickdapp/website",
  "private": true,
  "dependencies": {
    "elysia": "^1.3.8",
    "react": "^19.0.0",
    "drizzle-orm": "^0.44.4",
    "graphql-yoga": "^5.15.1",
    "@octokit/rest": "^21.0.0"
  }
}
```

---

## Docker Integration

**Source**: Pull patterns from `~/dev/the-echo-app/server`

Each package (base, variant-web3, website) has its own Docker configuration:

### Per-Package docker-compose.yaml (Development)

Located in each package directory (e.g., `packages/base/docker-compose.yaml`):

```yaml
services:
  postgres:
    image: postgres:17-alpine
    container_name: quickdapp-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_HOST_AUTH_METHOD: trust
    ports:
      - "5432:5432"
    volumes:
      - quickdapp-postgres-data:/var/lib/postgresql/data
      - ./scripts/init-db.sh:/docker-entrypoint-initdb.d/init-db.sh
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  quickdapp-postgres-data:
```

### Per-Package docker-compose.test.yaml (Testing)

Located in each package directory:

```yaml
services:
  postgres-test:
    image: postgres:17-alpine
    container_name: quickdapp-test-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_HOST_AUTH_METHOD: trust
    ports:
      - "5433:5432"
    volumes:
      - ./scripts/init-db.sh:/docker-entrypoint-initdb.d/init-db.sh
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    # No persistent volume - test data is ephemeral
```

### Per-Package scripts/init-db.sh

Located in each package's scripts/ directory:

```bash
#!/bin/bash
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE quickdapp_dev;
    CREATE DATABASE quickdapp_test;
EOSQL
```

### Per-Package Dockerfiles (Multi-platform)

Each deployable package (base, variant-web3, website) has:
- `Dockerfile` - Production multi-platform build
- `Dockerfile.dev` - Development with hot reload

**Pattern** (from echo-app):
```dockerfile
FROM oven/bun:latest
ARG TARGETPLATFORM
WORKDIR /app
ENV TARGETPLATFORM=${TARGETPLATFORM}

COPY dist/binaries/quickdapp-*-linux-* /app/
RUN if [ "$TARGETPLATFORM" = "linux/amd64" ]; then \
      cp /app/quickdapp-*-linux-x64 /app/quickdapp; \
    else \
      cp /app/quickdapp-*-linux-arm64 /app/quickdapp; \
    fi

RUN rm -rf /app/quickdapp-*-linux-* && chmod +x /app/quickdapp
EXPOSE 3000
ENTRYPOINT ["./quickdapp"]
```

---

## Root Configuration Files

### package.json

The root package.json is minimal - only workspace definition and release scripts.

```json
{
  "name": "quickdapp-monorepo",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "release": "bun run scripts/release.ts",
    "release:dry-run": "bun run scripts/release.ts --dry-run"
  },
  "devDependencies": {
    "commit-and-tag-version": "^12.5.0"
  }
}
```

**Note**: No shared tsconfig.json or biome.json at root. Each package (base, variant-web3, website) contains its own complete configuration. To work on a package, cd into its directory and run commands there.

---

## Package Relationships

```
                    ┌─────────────────┐
                    │  Root Workspace │
                    │  (scripts only) │
                    └────────┬────────┘
                             │
    ┌────────────────────────┼────────────────────────┐
    │            │           │           │            │
    ▼            ▼           ▼           ▼            ▼
┌────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐ ┌──────────┐
│  base  │ │ variant- │ │ website │ │  docs  │ │   cli    │
│        │ │   web3   │ │         │ │        │ │(published│
│(origin)│ │(derived) │ │(derived)│ │        │ │ to npm)  │
└────────┘ └──────────┘ └─────────┘ └────────┘ └──────────┘
    │            ▲           ▲
    │            │           │
    └────────────┴───────────┘
         Derivation flow
      (manual copy & modify)
```

**Key Points**:
- base, variant-web3, and website are **independent standalone codebases**
- No workspace dependencies between them - each is self-contained
- Variants and website are **derivations** of base (started as copies, evolved independently)
- CLI downloads release zips from GitHub - no workspace references
- Each package has its own tsconfig, biome, docker-compose, and scripts

---

## GitHub Actions

### .github/workflows/ci.yml

- Triggered on: push to main, pull requests
- Jobs:
  - Lint all packages
  - Build and test base package (with test PostgreSQL service)
  - Build and test variant-web3 package (with test PostgreSQL service)
  - Build and test website package (with test PostgreSQL service)
  - Build docs (verify docs build succeeds)

### .github/workflows/docker-base.yml

- Triggered on: changes to packages/base/**, manual dispatch
- Jobs:
  - Build base binaries
  - Build and push multi-platform Docker image to ghcr.io

### .github/workflows/docker-web3.yml

- Triggered on: changes to packages/variant-web3/**, manual dispatch
- Jobs:
  - Build web3 variant binaries
  - Build and push multi-platform Docker image to ghcr.io

### .github/workflows/release.yml

- Triggered on: push of version tags (v*) to main
- Uses commit-and-tag-version (not release-please)
- Jobs:
  - Build base package and create base.zip artifact
  - Build variant-web3 package and create variant-web3.zip artifact
  - Create GitHub release with zips attached (for CLI to download)
  - Publish create-quickdapp to npm

### Release Process (using commit-and-tag-version)

Located at root with `.versionrc.json` config:

```json
{
  "packageFiles": ["packages/cli/package.json"],
  "bumpFiles": ["packages/cli/package.json"],
  "infile": "CHANGELOG.md",
  "types": [
    { "type": "feat", "section": "Features" },
    { "type": "fix", "section": "Bug Fixes" },
    { "type": "perf", "section": "Performance" },
    { "type": "docs", "section": "Documentation" }
  ]
}
```

Release scripts in root package.json:
```json
{
  "scripts": {
    "release": "bun run scripts/release.ts",
    "release:dry-run": "bun run scripts/release.ts --dry-run"
  }
}
```

Release script (`scripts/release.ts`) will:
1. Run commit-and-tag-version to bump CLI version and generate CHANGELOG
2. Create git tag (vX.Y.Z)
3. Build base and variant-web3 packages
4. Create zip files for each
5. Push tag to trigger release workflow

---

## Migration Steps

### Phase 1: Repository Setup

1. Create new monorepo directory structure
2. Create root package.json (workspaces definition only)
3. Create root CLAUDE.md (monorepo instructions - see CLAUDE.md Files section)
4. Create .github/workflows/ directory
5. Create .versionrc.json for commit-and-tag-version
6. Create scripts/release.ts for release automation

### Phase 2: Base Package

1. Copy current QuickDapp project to packages/base/
2. Update package.json name to @quickdapp/base, ensure all configs are self-contained
3. Ensure tsconfig.json, biome.json are present in package
4. Ensure docker-compose.yaml, docker-compose.test.yaml are present
5. Ensure scripts/ directory with init-db.sh and other scripts
6. Remove all Web3-specific files (26 files - see list in Package Details)
7. Remove Web3 dependencies from package.json (viem, wagmi, rainbowkit, siwe)
8. Remove WEB3_ENABLED flag from client.ts and server.ts configs
9. Refactor AuthContext - remove Web3AuthProvider, keep NonWeb3AuthProvider only
10. Refactor App.tsx - remove Web3Providers wrapper
11. Remove SIWE from auth service
12. Remove Web3 workers from worker manager (watchChain, deployMulticall3)
13. Remove blockchain clients from bootstrap
14. Update CLAUDE.md (remove Web3 references, gear toward developers building on base)
15. Update tests to remove Web3 test cases
16. Verify build and tests pass

### Phase 3: Web3 Variant Package

1. Copy current QuickDapp project (with Web3) to packages/variant-web3/
2. Update package.json name to @quickdapp/variant-web3
3. Ensure tsconfig.json, biome.json are present in package
4. Ensure docker-compose.yaml, docker-compose.test.yaml are present
5. Ensure scripts/ directory with init-db.sh and other scripts
6. Remove WEB3_ENABLED conditionals throughout code (Web3 always enabled)
7. Update CLAUDE.md (note Web3 features, gear toward developers building on variant)
8. Update tests
9. Verify build and tests pass

### Phase 4: Website Package

1. Copy ~/dev/quickdapp/website3 to packages/website/
2. Update package.json name to @quickdapp/website
3. Ensure tsconfig.json, biome.json are present in package
4. Ensure docker-compose.yaml, docker-compose.test.yaml are present
5. Ensure scripts/ directory is present
6. Verify structure matches base pattern (server/client/shared)
7. Verify build and tests pass

### Phase 5: CLI Package

1. Create packages/cli/ directory structure
2. Create package.json with name "create-quickdapp" and bin entry
3. Create tsconfig.json for CLI
4. Implement Commander-based CLI (src/index.ts)
5. Implement system checks - verify git and bun in PATH
6. Implement GitHub release zip download and unzip
7. Implement git initialization (error if .git exists, skip with --skip-git)
8. Implement bun install execution
9. Implement initial git commit (conventional commit format, skip with --skip-git)
10. Build CLI to dist/
11. Test locally with npx/bunx
12. Prepare for npm publishing

### Phase 6: Docs Package

1. Move docs/ folder to packages/docs/
2. Create package.json for docs
3. Update retype.yml for new structure
4. Reorganize documentation:
   - /base/ - Base documentation
   - /variants/web3/ - Web3 variant documentation
   - /cli/ - CLI documentation
   - /deployment/ - Deployment guides
5. Update all internal references and links
6. Verify docs build succeeds

### Phase 7: GitHub Actions & Release Setup

1. Create .github/workflows/ci.yml (lint, build, test for all packages)
2. Create .github/workflows/docker-base.yml
3. Create .github/workflows/docker-web3.yml
4. Create .github/workflows/release.yml (triggered by version tags)
5. Test CI workflow runs successfully
6. Test release workflow with dry-run
7. Do initial release to create GitHub release with zips

### Phase 8: Final Verification

1. Test CLI downloads from GitHub release and creates working project
2. Test Docker builds for base, variant-web3, website
3. Verify all packages build and test independently
4. Update root README with monorepo overview
5. Create migration guide for existing QuickDapp users

---

## Verification

### Base Package
- [ ] `bun run dev` starts server without Web3
- [ ] `bun run test` passes all tests
- [ ] `bun run build` creates working binary
- [ ] Email/OAuth authentication works
- [ ] No Web3 dependencies in bundle

### Web3 Variant
- [ ] `bun run dev` starts server with Web3
- [ ] `bun run test` passes all tests
- [ ] `bun run build` creates working binary
- [ ] SIWE authentication works
- [ ] Wallet connection works
- [ ] Token operations work

### CLI
- [ ] `npx create-quickdapp my-app` runs with prompts
- [ ] `npx create-quickdapp my-app --template base` creates base project
- [ ] `npx create-quickdapp my-app --template web3` creates Web3 project
- [ ] `npx create-quickdapp my-app --skip-git` skips git initialization
- [ ] Generated projects build and run correctly

### Docker
- [ ] `docker compose up -d` starts PostgreSQL
- [ ] `docker compose -f docker-compose.test.yaml up -d` starts test DB
- [ ] Base Docker image builds and runs
- [ ] Web3 variant Docker image builds and runs
- [ ] Website Docker image builds and runs

### Website
- [ ] `bun run dev` starts marketing site
- [ ] `bun run test` passes all tests
- [ ] `bun run build` creates working binary
- [ ] GitHub stats fetching works
- [ ] Docker image builds and runs

### Docs
- [ ] `bun run docs:dev` starts local docs server
- [ ] All documentation renders correctly
- [ ] Links and references are valid

### Release Process
- [ ] `bun run release:dry-run` shows expected version bump
- [ ] `bun run release` creates tag and pushes
- [ ] GitHub release workflow creates release with base.zip and variant-web3.zip
- [ ] CLI can download zips from GitHub release

---

## Resolved Decisions

1. **Package naming**: Base package is `base` (not `core`). Future variants prefixed with `variant-`.
2. **Extension pattern**: Copy & Modify - each variant/website is a full copy of base with modifications. No workspace dependencies between them.
3. **Website approach**: Website is like a variant - it's a copy of base with customizations for marketing site.
4. **Publishing strategy**: Only CLI (`create-quickdapp`) is published to npm. Base/variants/website are private template packages.
5. **CLI approach**: Downloads release zips from GitHub (not degit/clone). Checks for git/bun, initializes git, runs bun install, creates initial commit.
6. **Release tooling**: Uses commit-and-tag-version (not release-please). Release script at root builds packages and creates zips for GitHub release.

---

## CLAUDE.md Files

### Root CLAUDE.md (Monorepo-level)

Location: `/CLAUDE.md`

This file explains how the monorepo is structured and should be the primary reference for understanding the codebase organization.

```markdown
# QuickDapp Monorepo

This is NOT a traditional monorepo with shared dependencies and interdependent packages. Instead, it's a collection of **independent, standalone codebases** organized together for convenience.

## Structure

```
packages/
├── base/           # Base QuickDapp - the foundation (no Web3)
├── variant-web3/   # Web3 variant - derivation of base with blockchain support
├── website/        # Marketing website - derivation of base for quickdapp.xyz
├── cli/            # create-quickdapp CLI tool (the only published package)
└── docs/           # Documentation
```

## Key Concept: Derivations, Not Dependencies

**base**, **variant-web3**, and **website** are NOT interdependent packages. They are:

- **Standalone**: Each has its own package.json, tsconfig.json, biome.json, docker-compose files, and scripts
- **Self-contained**: Each can be developed, built, and deployed independently
- **Derivations**: variant-web3 and website started as copies of base and evolved with their specific features

### Why This Pattern?

QuickDapp is a **boilerplate/template**, not a library. Users clone or download a package and modify it as their own project. This means:

1. Each package must be complete and runnable on its own
2. No workspace dependencies between base/variants/website
3. Variants can diverge from base where needed while sharing the core architecture

## Updating Base and Propagating Changes

When base is updated with bug fixes, improvements, or new features:

1. **Identify the changes** that should propagate to variants and website
2. **Port relevant changes** manually to each derivation
3. **Update versions** in each affected package
4. **Test each package** independently

Not all base changes need to propagate - variants may have intentionally diverged in certain areas.

## Creating New Variants

New variants should:

1. Be placed in `packages/variant-{name}/`
2. Start as a copy of base (or an existing variant)
3. Include all required files (package.json, tsconfig.json, biome.json, docker-compose files, scripts/, src/)
4. Have their own CLAUDE.md tailored to the variant's features

## Publishing Policy

- **Published to npm**: Only `create-quickdapp` (CLI)
- **Private templates**: base, variant-web3, website, docs

The CLI downloads release zips from GitHub releases - it does not reference workspace packages.

## Root Files

The root of this monorepo is intentionally minimal:
- `package.json` - Workspace definition + release scripts only
- `CLAUDE.md` - This file
- `.versionrc.json` - commit-and-tag-version configuration
- `CHANGELOG.md` - Generated changelog
- `scripts/release.ts` - Release automation
- `.github/workflows/` - CI/CD pipelines
- `bun.lock` - Shared lockfile

All other configuration (tsconfig, biome, docker, package scripts) lives within each package. To work on a package, cd into its directory.

## Releasing

Releases are done using commit-and-tag-version. Run from root:

```bash
bun run release           # Auto-determine version from commits
bun run release:dry-run   # Preview without making changes
```

This will:
1. Bump CLI version based on conventional commits
2. Update CHANGELOG.md
3. Create git tag
4. Build base and variant-web3 packages
5. Push tag to trigger release workflow (creates GitHub release with zips)
```

### Base Package CLAUDE.md

Location: `/packages/base/CLAUDE.md`

This is for developers building on top of QuickDapp. Content:
- Development guidelines (from current CLAUDE.md, with Web3 references removed)
- Architecture overview
- Testing guidelines
- Code style guidelines
- Note that this is the base package - the starting point for new QuickDapp projects

### Variant-web3 CLAUDE.md

Location: `/packages/variant-web3/CLAUDE.md`

Similar to base CLAUDE.md but:
- Include Web3-specific development guidelines
- Document the blockchain features (SIWE auth, wallet connection, token operations)
- Note that this is derived from base with Web3 support added
