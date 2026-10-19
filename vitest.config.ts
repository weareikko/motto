import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The eslint-plugin's src reads __PKG_NAME__/__PKG_VERSION__ (injected by its
// build config). Tests import src directly, so provide test-time values. Must
// live inside each project config — a top-level `define` does not propagate
// into `projects`.
const define = {
	__PKG_NAME__: JSON.stringify("@weareikko/eslint-plugin-skill"),
	__PKG_VERSION__: JSON.stringify("0.0.0-test"),
};

// Single root runner across workspaces. Each package's unit specs are `*.test.ts`;
// eval files (`*.eval.ts`, opt-in, cost money) are deliberately excluded here and
// run via packages/motto/vite.eval.config.ts instead.
const project = (name: string, include: string[]) => ({
	define,
	test: {
		name,
		root: fileURLToPath(new URL(`./packages/${name}`, import.meta.url)),
		include,
		environment: "node" as const,
	},
});

export default defineConfig({
	test: {
		passWithNoTests: true,
		projects: [
			project("eslint-plugin-skill", ["tests/**/*.test.ts"]),
			project("motto", ["src/**/*.test.ts", "tests/**/*.test.ts"]),
		],
	},
});
