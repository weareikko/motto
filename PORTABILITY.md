# Portability to oxlint

The rules in this plugin are written to run today under ESLint and to drop into
[oxlint](https://oxc.rs/docs/guide/usage/linter/plugins) once oxlint ships
Markdown linting. oxlint exposes "a plugin API identical to ESLint's", so the
constraint is simply to stay on the shared subset.

## Rules the code follows

- **Node-type selectors only.** Visitors key off mdast node types (`root`,
  `yaml`, `heading`, `link`, `image`) — no esquery attribute or pseudo
  selectors, and no `:exit`. Each rule uses a single `root(node)` visitor and
  walks the subtree itself (`src/utils/ast.js`), so behavior is independent of
  traversal ordering.
- **Report by `messageId` + `messages`.** Every `context.report` call passes
  `{ node | loc, messageId, data }` — no ad-hoc `message` strings, no `fix`
  functions (which differ across engines).
- **Minimal context surface.** Rules read `context.filename` and
  `context.options` only. They do not depend on `context.sourceCode` helpers;
  all logic runs on node properties and the raw frontmatter string.
- **Plain ESM, one runtime dep.** Rule modules are plain `.js`/ESM with no build
  step. The only runtime dependency is `yaml`; `@eslint/markdown` supplies the
  parser.
- **Self-contained, side-effect-free modules.** Each rule is a standalone module
  that can later be wrapped by [`@oxlint/plugins`](https://oxc.rs/docs/guide/usage/linter/writing-js-plugins)
  (`eslintCompatPlugin` / `createOnce`) without edits.

## The one host dependency

`no-broken-relative-links` uses `node:fs` and `node:path`. Both ESLint and
oxlint JS plugins run in Node, so this is portable — but it is the only rule
that touches the filesystem, and it is isolated for that reason.

## When oxlint adds Markdown support

The expected shim is to re-export the same rule objects through
`eslintCompatPlugin({ meta, rules })`. No rule logic should need to change.
