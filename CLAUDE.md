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

When base is updated with bug fixes, improvements, or new features, those changes must be ported to variants and website **before publishing a new release**.

### Porting Process

1. **Analyze changes** - Use LLM analysis to review what changed in base and determine what needs to be ported to each derivation
2. **Port relevant changes** - Apply the identified changes to variants and website. The LLM can help figure out what modifications are needed given each derivation's differences
3. **Update/add tests** - Ensure tests are updated or added to cover the ported changes
4. **Run tests** - Execute test suites in each affected package
5. **Manual verification** - Developer should manually verify the changes work correctly in each derivation
6. **Update versions** - Bump versions in each affected package

### Important Notes

- Not all base changes need to propagate - variants may have intentionally diverged in certain areas
- Review each change carefully - some base changes may conflict with variant-specific code
- Always test thoroughly before releasing - automated tests plus manual verification

### Website Package Exceptions

When porting base changes to website:
- **Skip husky/git hooks** - Website is not released as standalone code for third parties
- **Skip commitlint setup** - Internal use only, commit conventions enforced at monorepo level

## Creating New Variants

New variants should:

1. Be placed in `packages/variant-{name}/`
2. Start as a copy of base (or an existing variant)
3. Include all required files (package.json, tsconfig.json, biome.json, docker-compose files, scripts/, src/)
4. Have their own CLAUDE.md tailored to the variant's features

## Variant Maintenance Policy

**variant-web3** is just one of many possible future variants. The variant system allows for specialized derivations of the base package for different use cases (Web3, mobile, desktop, etc.).

### Critical Rule: Variants Must Stay Current

All variants **MUST** be kept up-to-date with base package changes **before any release**. This ensures:

1. Bug fixes propagate to all variants
2. Security patches reach all derivations
3. New features are available across the ecosystem
4. Testing infrastructure improvements benefit all variants

### Pre-Release Checklist

Before running `bun run release`:

1. Review recent commits to `packages/base/`
2. Identify changes that need porting to each variant
3. Port applicable changes to `packages/variant-web3/` (and any other variants)
4. Run full test suite in each variant: `cd packages/variant-web3 && bun run test`
5. Verify builds succeed: `cd packages/variant-web3 && bun run build`
6. Manual smoke test of variant-specific features

### What to Port vs What to Skip

**Always port:**
- Test infrastructure improvements
- Build script enhancements
- Bug fixes in shared code
- Security updates
- Dependency version updates

**Review carefully (may need adaptation):**
- Authentication changes (variants may have different auth methods)
- Database schema changes (variants may have additional tables)
- GraphQL schema changes (variants may have additional types/fields)
- Client component changes (variants may have different UI)

**Never port:**
- Variant-specific features back to base
- Changes that conflict with variant's purpose

### Reverse Porting: Variant to Base

When making changes in a variant that apply to shared code (not variant-specific features), those changes should be ported back to base and all other variants:

1. **Identify shared code changes** - Bug fixes, test improvements, or infrastructure changes that aren't variant-specific
2. **Port to base first** - Apply the fix to the base package
3. **Port to all variants** - Apply the same fix to all other variants (variant-web3, website, etc.)

This ensures bug fixes and improvements discovered while working on a variant benefit the entire codebase.

## Publishing Policy

- **Published to npm**: Only `create-quickdapp` (CLI)
- **Private templates**: base, variant-web3, website, docs

The CLI downloads release zips from GitHub releases - it does not reference workspace packages.

## Version Management

### Synchronized Versions
All packages share the same version and are bumped together by commit-and-tag-version:
- `packages/base/` - Base template
- `packages/variant-web3/` - Web3 variant
- `packages/website/` - Marketing site
- `packages/cli/` - Published CLI tool

These versions are automatically synchronized when running `bun run release`.

### Independent Versions
- `packages/docs/` - Documentation, no version tracking

### How Versioning Works
1. `bun run release` invokes commit-and-tag-version
2. commit-and-tag-version analyzes conventional commits
3. All four packages are bumped to the new version
4. Git tag is created from base package version
5. GitHub Actions creates release with tarballs
6. CLI npm release matches GitHub release version

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
