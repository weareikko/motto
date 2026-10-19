/**
 * The file access seam of the rules that look past the linted file
 * (`no-broken-relative-links`, `no-orphan-references`, the `kind` rules).
 *
 * By default they read the disk. A host that keeps its skills somewhere else
 * (a database, a remote store) passes every file of the linted skills in the
 * shared setting `settings.skill.files` — a map from path to content — and
 * lints them in memory with ESLint's `Linter`. The paths are resolved like
 * the linted `filename`, so `/skills/demo/SKILL.md` and
 * `/skills/demo/references/a.md` are siblings exactly as on disk. A flat
 * config matches only files under the `Linter`'s `cwd`, so pass the virtual
 * root as `cwd` (`new Linter({ cwd: "/skills" })`).
 */

import { existsSync, readdirSync } from "node:fs";
import { join, resolve, sep } from "node:path";

/** The shape of `settings.skill`. */
export interface SkillSettings {
	/** Every file of the linted skills, keyed by path. Replaces the disk when present. */
	files?: Record<string, string>;
}

/** What the rules need from a file system. */
export interface SkillFs {
	/** Whether a file or a directory exists at an absolute path. */
	exists(path: string): boolean;
	/** Every `.md` file under a directory, recursively, as absolute paths. */
	markdownFilesUnder(dir: string): string[];
}

function diskMarkdownFilesUnder(dir: string): string[] {
	if (!existsSync(dir)) {
		return [];
	}
	const out: string[] = [];
	const walk = (current: string): void => {
		let entries;
		try {
			entries = readdirSync(current, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const full = join(current, entry.name);
			if (entry.isDirectory()) {
				walk(full);
			} else if (entry.isFile() && entry.name.endsWith(".md")) {
				out.push(full);
			}
		}
	};
	walk(dir);
	return out;
}

const diskFs: SkillFs = {
	exists: existsSync,
	markdownFilesUnder: diskMarkdownFilesUnder,
};

/** A file system over an in-memory map of path → content. */
export function memoryFs(files: Record<string, string>): SkillFs {
	const paths = Object.keys(files).map((path) => resolve(path));
	const under = (dir: string): string[] => {
		const prefix = resolve(dir) + sep;
		return paths.filter((path) => path.startsWith(prefix));
	};

	return {
		exists: (path) => {
			const target = resolve(path);
			return paths.includes(target) || under(target).length > 0;
		},
		markdownFilesUnder: (dir) => under(dir).filter((path) => path.endsWith(".md")),
	};
}

/** The file system a rule must use, chosen from the shared settings. */
export function skillFs(settings: Readonly<Record<string, unknown>> | undefined): SkillFs {
	const files = (settings?.skill as SkillSettings | undefined)?.files;
	return files ? memoryFs(files) : diskFs;
}
