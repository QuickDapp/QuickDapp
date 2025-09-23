# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [3.0.4](https://github.com/QuickDapp/QuickDapp/compare/v3.0.3...v3.0.4) (2025-09-23)


### Bug Fixes

* db verification command in ci ([44a0e1d](https://github.com/QuickDapp/QuickDapp/commit/44a0e1dcf14ba8e837207b80409a5be7d666670c))

## [3.0.3](https://github.com/QuickDapp/QuickDapp/compare/v3.0.2...v3.0.3) (2025-09-23)

## [3.0.2](https://github.com/QuickDapp/QuickDapp/compare/v3.0.1...v3.0.2) (2025-09-23)

## [3.0.1](https://github.com/QuickDapp/QuickDapp/compare/v3.0.0...v3.0.1) (2025-09-23)

## 3.0.0 (2025-09-23)


### ⚠ BREAKING CHANGES

* bun run build now always creates binaries by default

### Features

* add CI, license, and TypeScript badges to README and repository info to package.json ([36e8506](https://github.com/QuickDapp/QuickDapp/commit/36e850612515ebb8d91a029e10f17ae7f8b59ec1))
* add Docker support and fix binary asset bundling ([c8388b6](https://github.com/QuickDapp/QuickDapp/commit/c8388b635daa2cd278b208722bbd0901029730c0))
* add production command and simplify build process ([8764b24](https://github.com/QuickDapp/QuickDapp/commit/8764b24f05781c6d34a515bf08059f83593381aa))
* enhance authentication system and reorganize test structure ([e66e20f](https://github.com/QuickDapp/QuickDapp/commit/e66e20f639a058db066dee4f8b0bd80c63937c5a))
* implement complete v3 frontend architecture with blockchain integration ([b1a71a1](https://github.com/QuickDapp/QuickDapp/commit/b1a71a1bc0dbfbfe20d7d3f33038c3fbac64a188))
* implement comprehensive test infrastructure with database helpers ([f4384e1](https://github.com/QuickDapp/QuickDapp/commit/f4384e165557df671c426da2888803d3a6234479))
* implement QuickDapp v3 server with ServerApp pattern ([128367f](https://github.com/QuickDapp/QuickDapp/commit/128367fbac33badfe1bb40628fea0b7a46ce3484))
* improve README documentation and fix blockchain tests ([adcee56](https://github.com/QuickDapp/QuickDapp/commit/adcee561c76e5d59ae2f730931c505a3b5ad3ab8))
* merge sockets branch with WebSocket support and race condition fix ([a341abf](https://github.com/QuickDapp/QuickDapp/commit/a341abfe5f17e435bddc9b1a53585108177ab645))
* update package.json with proper scoped name, version 3.0.0, and enhanced metadata ([12eb518](https://github.com/QuickDapp/QuickDapp/commit/12eb518cf393a749fa1866aba20edecafeb2e31e))


### Bug Fixes

* ensure worker processes use correct runtime executable ([ac5df7f](https://github.com/QuickDapp/QuickDapp/commit/ac5df7fd881234cf663f95e3cc7d89bc92020666))
* format logger.ts ([bd08b33](https://github.com/QuickDapp/QuickDapp/commit/bd08b3376cecd6dbf51f0916f2addaffb8e914ba))
* resolve bun executable path issues in CI and tests ([b5a2c75](https://github.com/QuickDapp/QuickDapp/commit/b5a2c757b9c8b3392e084d14b7ce3e12cb5bd8b0))
* resolve database connection pool exhaustion and test infrastructure issues ([6baff6b](https://github.com/QuickDapp/QuickDapp/commit/6baff6b3f70cac6b684132b7666a0ae452c5dd94))
* **test:** correct db command and remove failing SPA test ([e0cc50e](https://github.com/QuickDapp/QuickDapp/commit/e0cc50ed968b24cb8b2bcd88b455c2f48d47ca29))

## 4.0.0 (2025-09-23)


### ⚠ BREAKING CHANGES

* bun run build now always creates binaries by default

### Features

* add CI, license, and TypeScript badges to README and repository info to package.json ([36e8506](https://github.com/QuickDapp/QuickDapp/commit/36e850612515ebb8d91a029e10f17ae7f8b59ec1))
* add Docker support and fix binary asset bundling ([c8388b6](https://github.com/QuickDapp/QuickDapp/commit/c8388b635daa2cd278b208722bbd0901029730c0))
* add production command and simplify build process ([8764b24](https://github.com/QuickDapp/QuickDapp/commit/8764b24f05781c6d34a515bf08059f83593381aa))
* enhance authentication system and reorganize test structure ([e66e20f](https://github.com/QuickDapp/QuickDapp/commit/e66e20f639a058db066dee4f8b0bd80c63937c5a))
* implement complete v3 frontend architecture with blockchain integration ([b1a71a1](https://github.com/QuickDapp/QuickDapp/commit/b1a71a1bc0dbfbfe20d7d3f33038c3fbac64a188))
* implement comprehensive test infrastructure with database helpers ([f4384e1](https://github.com/QuickDapp/QuickDapp/commit/f4384e165557df671c426da2888803d3a6234479))
* implement QuickDapp v3 server with ServerApp pattern ([128367f](https://github.com/QuickDapp/QuickDapp/commit/128367fbac33badfe1bb40628fea0b7a46ce3484))
* improve README documentation and fix blockchain tests ([adcee56](https://github.com/QuickDapp/QuickDapp/commit/adcee561c76e5d59ae2f730931c505a3b5ad3ab8))
* merge sockets branch with WebSocket support and race condition fix ([a341abf](https://github.com/QuickDapp/QuickDapp/commit/a341abfe5f17e435bddc9b1a53585108177ab645))
* update package.json with proper scoped name, version 3.0.0, and enhanced metadata ([12eb518](https://github.com/QuickDapp/QuickDapp/commit/12eb518cf393a749fa1866aba20edecafeb2e31e))


### Bug Fixes

* ensure worker processes use correct runtime executable ([ac5df7f](https://github.com/QuickDapp/QuickDapp/commit/ac5df7fd881234cf663f95e3cc7d89bc92020666))
* format logger.ts ([bd08b33](https://github.com/QuickDapp/QuickDapp/commit/bd08b3376cecd6dbf51f0916f2addaffb8e914ba))
* resolve bun executable path issues in CI and tests ([b5a2c75](https://github.com/QuickDapp/QuickDapp/commit/b5a2c757b9c8b3392e084d14b7ce3e12cb5bd8b0))
* resolve database connection pool exhaustion and test infrastructure issues ([6baff6b](https://github.com/QuickDapp/QuickDapp/commit/6baff6b3f70cac6b684132b7666a0ae452c5dd94))
* **test:** correct db command and remove failing SPA test ([e0cc50e](https://github.com/QuickDapp/QuickDapp/commit/e0cc50ed968b24cb8b2bcd88b455c2f48d47ca29))
