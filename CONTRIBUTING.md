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
