# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [3.10.4](https://github.com/QuickDapp/QuickDapp/compare/v3.10.3...v3.10.4) (2026-02-04)


### Bug Fixes

* **website:** exclude README.md and LICENSE.md from docs parsing ([fb91153](https://github.com/QuickDapp/QuickDapp/commit/fb91153fc07d836df0923ce651da0e5737eda9ad))


### Documentation

* remove static llms.txt from website ([1c1f4a3](https://github.com/QuickDapp/QuickDapp/commit/1c1f4a373a1334287b3935f16329d792511e434e))

## [3.10.3](https://github.com/QuickDapp/QuickDapp/compare/v3.10.2...v3.10.3) (2026-02-04)


### Documentation

* rename llm-plugin page to llm-plugins and update references ([768fc2c](https://github.com/QuickDapp/QuickDapp/commit/768fc2ca2109dac431ef402ab56e8b29ade095eb))

## [3.10.2](https://github.com/QuickDapp/QuickDapp/compare/v3.10.1...v3.10.2) (2026-02-04)


### Documentation

* add LLM plugin docs page and CLI recommendation ([95b5a69](https://github.com/QuickDapp/QuickDapp/commit/95b5a696f2d5801841571aadaa97db1f8911c708))

## [3.10.1](https://github.com/QuickDapp/QuickDapp/compare/v3.10.0...v3.10.1) (2026-02-04)


### Bug Fixes

* **website:** resolve llms.txt link to actual version number when on latest ([797de08](https://github.com/QuickDapp/QuickDapp/commit/797de08fd29f4b7eda3541c64d72e7a0afa005bb))


### Documentation

* add root README and rewrite package READMEs ([5569d9f](https://github.com/QuickDapp/QuickDapp/commit/5569d9fbb76af78b74375be38f3b17ed55d57d85))
* **cli:** fix README title to @quickdapp/cli ([7bab5e8](https://github.com/QuickDapp/QuickDapp/commit/7bab5e83cb41fc0ed6a7360dabd06e185ec906d7))
* **cli:** rewrite README with QuickDapp intro and accurate options ([8ada8bc](https://github.com/QuickDapp/QuickDapp/commit/8ada8bc3a0a422dc5db6d28d8dbdabb166b89429))
* update CLAUDE.md files with llms.txt links and accurate CLI commands ([e86090c](https://github.com/QuickDapp/QuickDapp/commit/e86090c64dab8c7ac70fdfa4ca5471f6bb3a0d50))
* update README links and descriptions ([a54a0ab](https://github.com/QuickDapp/QuickDapp/commit/a54a0abe3a14b24c0aa3523b7846fa07edcc900f))

## [3.10.0](https://github.com/QuickDapp/QuickDapp/compare/v3.9.1...v3.10.0) (2026-02-03)


### Features

* **website:** add visible border and shadow to docs images ([857faf6](https://github.com/QuickDapp/QuickDapp/commit/857faf6ca410b83948b7bc0e8cba6d935ead0b6b))


### Bug Fixes

* **tests:** prevent race condition in job cancellation test ([b6ba34f](https://github.com/QuickDapp/QuickDapp/commit/b6ba34f88c38c9f33da5fc311972cf8aea7f63d0))
* **website:** improve docs navigation and internal link handling ([83266c6](https://github.com/QuickDapp/QuickDapp/commit/83266c62553af42c6d3f0714ff702d3f58195d9b))

## [3.9.1](https://github.com/QuickDapp/QuickDapp/compare/v3.9.0...v3.9.1) (2026-01-29)


### Bug Fixes

* **base:** remove duplicate logout button from HomePage ([9ae95c3](https://github.com/QuickDapp/QuickDapp/commit/9ae95c3d59f48756e3db0d769d658431cf7abdbb))
* **ci:** preserve CI-provided env vars and fetch git tags for CLI tests ([ab85b29](https://github.com/QuickDapp/QuickDapp/commit/ab85b297e0762d296fb9db685c19d8318f97f2fa))
* **cli:** use async spawn for tests requiring server responses ([f0ef1b2](https://github.com/QuickDapp/QuickDapp/commit/f0ef1b2384675bece50f9f71ec83900ed93cceb5))
* **test:** derive admin database URL from test config for CI compatibility ([de6d336](https://github.com/QuickDapp/QuickDapp/commit/de6d336615fce7b904c4b135bbdadeead896de8f))

## [3.9.0](https://github.com/QuickDapp/QuickDapp/compare/v3.8.0...v3.9.0) (2026-01-29)


### Features

* add dark mode support with theme switcher ([8f8499c](https://github.com/QuickDapp/QuickDapp/commit/8f8499cf5138692e5f058497f61c95d199e508e9))
* add pre-build steps to docker workflows and improve CI test setup ([8180422](https://github.com/QuickDapp/QuickDapp/commit/818042204d10c8c9179935272879a5079ca518fb))


### Bug Fixes

* add health and version endpoint proxies to vite dev server ([28f1149](https://github.com/QuickDapp/QuickDapp/commit/28f11492490983016a21fbf51571c9712db45f38))
* add schemaFilter to drizzle config to target public schema only ([ddfc074](https://github.com/QuickDapp/QuickDapp/commit/ddfc0741c67dd456fa0e47a8fcb13873394c8745))
* **website:** fetch git tags in docker workflow for docs versioning ([e090435](https://github.com/QuickDapp/QuickDapp/commit/e0904357d317c0055384706bb72dd9f4da84ac84))

## [3.8.0](https://github.com/QuickDapp/QuickDapp/compare/v3.7.0...v3.8.0) (2026-01-28)


### Features

* **cli:** add create subcommand and change default variant to base ([9c705c0](https://github.com/QuickDapp/QuickDapp/commit/9c705c08b0e336aa91a5d5860b2c1ba3b090e88a))


### Bug Fixes

* **website:** guard fetch-docs CLI to prevent argv conflict on import ([cc46275](https://github.com/QuickDapp/QuickDapp/commit/cc46275a2fc8486d099a23111344b8c2326038ba))

## [3.7.0](https://github.com/QuickDapp/QuickDapp/compare/v3.5.3...v3.7.0) (2026-01-28)


### Features

* **cli:** add version listing and specific version install ([e364ec6](https://github.com/QuickDapp/QuickDapp/commit/e364ec6b2e017a990e8f7219c1e711997a4c7e85))
* docs architecture ([#9](https://github.com/QuickDapp/QuickDapp/issues/9)) ([4b7c209](https://github.com/QuickDapp/QuickDapp/commit/4b7c2091759581e56220b8554c2fcefe47c442d8))
* **website:** add docs search and UI components ([5dd1240](https://github.com/QuickDapp/QuickDapp/commit/5dd12404e149ace8571a6b8cff89968fd105de88))
* **website:** add header with logo and theme switcher ([080602d](https://github.com/QuickDapp/QuickDapp/commit/080602df8c0c750760fe80e4ca7a98f1b874b4f9))
* **website:** add mobile sidebar and switch to light-mode-first theming ([ca018ff](https://github.com/QuickDapp/QuickDapp/commit/ca018ffc25014f07728564b1ff5832c8dacd8b3e))
* **website:** add typewriter effect to homepage tagline ([aa2f78d](https://github.com/QuickDapp/QuickDapp/commit/aa2f78d607a995123201de2e1d68f4671bf47280))
* **website:** redesign homepage and update branding ([a8d0df9](https://github.com/QuickDapp/QuickDapp/commit/a8d0df96e3b725220f10cfcabec81c77937c1884))


### Performance

* **website:** move search index building to build-time ([d65f3a1](https://github.com/QuickDapp/QuickDapp/commit/d65f3a1b69090bb4cc157b2ec9e2a65c68dfd079))


### Documentation

* clarify terminal usage in README quick start sections ([2c64e77](https://github.com/QuickDapp/QuickDapp/commit/2c64e7702764b053cdc7c48341f7b393ce773080))
* **plan:** expand versioned docs plan with frontmatter restoration ([5256678](https://github.com/QuickDapp/QuickDapp/commit/52566784f633a75a8b3aacff688c84dfafaa4907))
* revamp introduction and add tutorials/variants sections ([870ed54](https://github.com/QuickDapp/QuickDapp/commit/870ed5473f07053828084db56bbbcf0d6c580ebd))

## [3.6.0](https://github.com/QuickDapp/QuickDapp/compare/v3.5.3...v3.6.0) (2026-01-26)


### Features

* **cli:** add version listing and specific version install ([e364ec6](https://github.com/QuickDapp/QuickDapp/commit/e364ec6b2e017a990e8f7219c1e711997a4c7e85))
* **website:** add header with logo and theme switcher ([080602d](https://github.com/QuickDapp/QuickDapp/commit/080602df8c0c750760fe80e4ca7a98f1b874b4f9))
* **website:** add typewriter effect to homepage tagline ([aa2f78d](https://github.com/QuickDapp/QuickDapp/commit/aa2f78d607a995123201de2e1d68f4671bf47280))
* **website:** add versioned documentation pages ([bcf55a2](https://github.com/QuickDapp/QuickDapp/commit/bcf55a25420a3ebacab747a284515814bbe0fd0d))
* **website:** improve docs rendering with Shiki and UX enhancements ([83ec18c](https://github.com/QuickDapp/QuickDapp/commit/83ec18c986000bc784dbd9623a16c1509f1dfd74))
* **website:** instant docs rendering with deferred syntax highlighting ([7403188](https://github.com/QuickDapp/QuickDapp/commit/740318844e22ef5bf3026745c6ce92f63dc3cc38))
* **website:** redesign homepage and update branding ([a8d0df9](https://github.com/QuickDapp/QuickDapp/commit/a8d0df96e3b725220f10cfcabec81c77937c1884))


### Bug Fixes

* **website:** update docs link to /docs ([71ed36b](https://github.com/QuickDapp/QuickDapp/commit/71ed36b1f504803491a718ea12b20a75e29be4fe))


### Documentation

* clarify terminal usage in README quick start sections ([2c64e77](https://github.com/QuickDapp/QuickDapp/commit/2c64e7702764b053cdc7c48341f7b393ce773080))
* **plan:** expand versioned docs plan with frontmatter restoration ([5256678](https://github.com/QuickDapp/QuickDapp/commit/52566784f633a75a8b3aacff688c84dfafaa4907))

## [3.5.3](https://github.com/QuickDapp/QuickDapp/compare/v3.5.2...v3.5.3) (2026-01-25)

## [3.5.2](https://github.com/QuickDapp/QuickDapp/compare/v3.5.1...v3.5.2) (2026-01-25)

## [3.5.1](https://github.com/QuickDapp/QuickDapp/compare/v3.5.0...v3.5.1) (2026-01-24)

## [3.5.0](https://github.com/QuickDapp/QuickDapp/compare/v3.4.0...v3.5.0) (2026-01-24)


### Features

* **cli:** rename package to @quickdapp/cli with npm provenance ([96ca92e](https://github.com/QuickDapp/QuickDapp/commit/96ca92e7498c1bda89eb51038e90db37ab1e9530))


### Bug Fixes

* **variant-web3:** fix import order in job-scheduling test ([cc27d3c](https://github.com/QuickDapp/QuickDapp/commit/cc27d3cdb2868e42e93609839baed41ee9d0430b))
