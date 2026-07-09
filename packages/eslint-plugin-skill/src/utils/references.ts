/**
 * Shared filesystem helpers for a skill's `references/` directory.
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Recursively list every `.md` file under a skill's `references/` directory. */
export function referenceMarkdownFiles(skillDir: string): string[] {
	const referencesDir = join(skillDir, "references");
	if (!existsSync(referencesDir)) {
		return [];
	}

	const out: string[] = [];
	const walk = (dir: string): void => {
		let entries;
		try {
			entries = readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const full = join(dir, entry.name);
			if (entry.isDirectory()) {
				walk(full);
			} else if (entry.isFile() && entry.name.endsWith(".md")) {
				out.push(full);
			}
		}
	};
	walk(referencesDir);
	return out;
}
