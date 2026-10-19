/**
 * Shared helpers for a skill's `references/` directory.
 */

import { join } from "node:path";

import type { SkillFs } from "./skill-fs";

/** Every `.md` file under a skill's `references/` directory, recursively. */
export function referenceMarkdownFiles(skillDir: string, fs: SkillFs): string[] {
	return fs.markdownFilesUnder(join(skillDir, "references"));
}
