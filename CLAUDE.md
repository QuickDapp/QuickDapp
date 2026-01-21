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
