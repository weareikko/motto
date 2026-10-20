# Contributing

## Development

Written in TypeScript, bundled with Vite, tested with Vitest.

```sh
npm install
npm run build      # vite build -> dist/index.js + tsc declarations
npm test           # vitest: RuleTester specs + end-to-end integration test
npm run typecheck  # tsc --noEmit (src, then tests)
npm run check      # typecheck + tests (the CI gate)
```

`.github/workflows/ci.yml` runs typecheck, build, and tests on every push and PR to `main`.

## Changelog and releases

A pull request that changes what ships (`packages/eslint-plugin-skill/src/**`, `packages/eslint-plugin-skill/configs/**` or `packages/motto/src/**`) adds a fragment `.changelog/<slug>.md` with [`@weareikko/changelog`](https://github.com/weareikko/changelog): one or more `###` sections of Keep a Changelog (`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`, `Dependencies`), each with short entries and no pull request number. The `Changelog` workflow checks it; the `no-changelog` label skips the check for tests, docs and tooling.

Each merge into `main` runs `.github/workflows/publish.yml`: it folds the fragments into [`CHANGELOG.md`](CHANGELOG.md), computes the next SemVer version from them, commits `chore: release <version>`, tags the version, creates the GitHub release and publishes `@weareikko/eslint-plugin-skill` and `@weareikko/motto` to npm. `gh workflow run publish.yml -f version=minor` forces a bump.
