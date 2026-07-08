/**
 * Discover skills and their reference files under a root directory.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

import { hashContent } from "./hash";
import type { ReferenceFile } from "./types";

const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "coverage"]);

/** Recursively find every directory containing a `SKILL.md` file. */
export function findSkillDirs(root: string): string[] {
	const out: string[] = [];
	const walk = (dir: string): void => {
		let entries;
		try {
			entries = readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		if (entries.some((e) => e.isFile() && e.name === "SKILL.md")) {
			out.push(dir);
		}
		for (const entry of entries) {
			if (entry.isDirectory() && !IGNORED_DIRS.has(entry.name)) {
				walk(join(dir, entry.name));
			}
		}
	};
	walk(root);
	return out.sort();
}

/**
 * The comparison scope a skill belongs to under the "plugin" strategy: the
 * parent of the nearest ancestor directory literally named `skills` (i.e. the
 * plugin directory for sibling skills under `plugins/<x>/skills/*`). Skills
 * with no such ancestor fall back to `root`.
 */
export function scopeKeyFor(skillDir: string, root: string): string {
	const parent = dirname(skillDir);
	if (basename(parent) === "skills") {
		return dirname(parent);
	}
	return root;
}

/** Recursively list `.md` files under a directory, relative-path keyed. */
function markdownFilesRelative(dir: string, base = dir): Record<string, string> {
	const out: Record<string, string> = {};
	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return out;
	}
	for (const entry of entries) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			Object.assign(out, markdownFilesRelative(full, base));
		} else if (entry.isFile() && entry.name.endsWith(".md")) {
			out[relative(base, full)] = full;
		}
	}
	return out;
}

/** Gather every reference file for a skill, with content + hash loaded. */
export function referenceFilesFor(skillDir: string): ReferenceFile[] {
	const skillName = basename(skillDir);
	const referencesDir = join(skillDir, "references");
	try {
		if (!statSync(referencesDir).isDirectory()) {
			return [];
		}
	} catch {
		return [];
	}

	const files = markdownFilesRelative(referencesDir);
	return Object.entries(files).map(([relPath, absPath]) => {
		const raw = readFileSync(absPath, "utf8");
		return { skillName, skillDir, relPath, absPath, hash: hashContent(raw), raw };
	});
}
