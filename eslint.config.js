// Dogfood config: lint this repo's own skill fixtures with our own plugin.
// The `bad-name` fixture is intentionally broken (it demonstrates failures in
// the docs/smoke tests), so it is excluded here.

import motto from "./src/index.js";

export default [
	{ ignores: ["tests/fixtures/bad-name/**", "node_modules/**"] },
	motto.configs.recommended,
];
