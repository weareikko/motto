import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { builtinModules } from "node:module";
import { defineConfig, type UserConfig } from "vite";

/**
 * Shared Vite library-build factory for every package in the monorepo.
 *
 * Each package's `vite.config.ts` is a one-line call into this. It handles:
 * - ES lib build with one or more named entries;
 * - externalizing all bare imports (node builtins, npm deps, workspace pkgs);
 * - injecting the package's own name/version as `__PKG_NAME__`/`__PKG_VERSION__`.
 *
 * Type declarations are emitted separately by `tsc --emitDeclarationOnly`
 * (per-package build script), not vite-plugin-dts — this mirrors the setup the
 * eslint-plugin already shipped and keeps the migration low-risk.
 */
export interface LibraryOptions {
	/** Pass `import.meta.url` from the package's vite.config.ts. */
	root: string;
	/** Entry map (name → path relative to the package root). Default: src/index.ts. */
	entry?: Record<string, string>;
	/** Vite `resolve.alias` applied only in serve mode (vite-node dev). */
	devAliases?: Record<string, string>;
}

function isBareImport(id: string): boolean {
	return !id.startsWith(".") && !id.startsWith("/") && !id.startsWith("\0");
}

export function defineLibrary(options: LibraryOptions): UserConfig {
	const root = fileURLToPath(new URL(".", options.root));
	const entryRaw = options.entry ?? { index: "src/index.ts" };
	const entry = Object.fromEntries(
		Object.entries(entryRaw).map(([name, p]) => [name, resolve(root, p)]),
	);
	const pkg = JSON.parse(
		readFileSync(resolve(root, "package.json"), "utf8"),
	) as { name: string; version: string };

	return defineConfig(({ command }) => ({
		root,
		resolve: { alias: command === "serve" ? options.devAliases : undefined },
		define: {
			__PKG_NAME__: JSON.stringify(pkg.name),
			__PKG_VERSION__: JSON.stringify(pkg.version),
		},
		build: {
			target: "node20",
			outDir: "dist",
			sourcemap: true,
			minify: false,
			emptyOutDir: true,
			lib: {
				entry,
				formats: ["es"],
				fileName: (_format, entryName) => `${entryName}.js`,
			},
			rollupOptions: {
				// Externalize node builtins + all bare imports (deps/workspace pkgs).
				// A leading `#!` shebang in an entry's source is auto-preserved by
				// rollup, so bin entries stay executable (chmod is done in the
				// package build script).
				external: (id) =>
					builtinModules.includes(id) ||
					id.startsWith("node:") ||
					isBareImport(id),
			},
		},
	})) as unknown as UserConfig;
}
