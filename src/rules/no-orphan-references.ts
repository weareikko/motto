/**
 * @fileoverview Flag reference files not linked from SKILL.md.
 *
 * A `.md` file sitting in `references/` that nothing in SKILL.md links to is
 * dead weight: Claude is told to load reference files via the pointers in
 * SKILL.md, so an unlinked one is never read. It's usually a leftover, a
 * rename that broke the link, or a missing pointer.
 */

import { existsSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

import type { MarkdownRuleDefinition } from "@eslint/markdown";

import { isSkillFile } from "../utils/skill-file";
import { collectLinkTargets, isRelativeUrl, urlToPath } from "../utils/links";

const TOP = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };

/** Recursively list `.md` files under a directory, as absolute paths. */
function markdownFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			out.push(...markdownFiles(full));
		} else if (entry.isFile() && entry.name.endsWith(".md")) {
			out.push(full);
		}
	}
	return out;
}

const rule: MarkdownRuleDefinition<{
	RuleOptions: [];
	MessageIds: "orphan";
}> = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Flag reference files not linked from SKILL.md",
			recommended: true,
			url: "https://github.com/ikko-dev/eslint-plugin-skill/blob/main/docs/rules/no-orphan-references.md",
		},
		schema: [],
		messages: {
			orphan:
				"Reference file `{{file}}` is not linked from SKILL.md and will never be read.",
		},
	},

	create(context) {
		if (!isSkillFile(context.filename)) {
			return {};
		}
		const skillDir = dirname(context.filename);
		const referencesDir = join(skillDir, "references");
		if (
			!skillDir ||
			skillDir === "." ||
			context.filename === "<input>" ||
			!existsSync(referencesDir)
		) {
			return {};
		}

		return {
			root(root) {
				const linked = new Set(
					collectLinkTargets(root)
						.filter(({ url }) => isRelativeUrl(url))
						.map(({ url }) => resolve(skillDir, urlToPath(url))),
				);

				for (const file of markdownFiles(referencesDir)) {
					if (!linked.has(file)) {
						context.report({
							loc: TOP,
							messageId: "orphan",
							data: { file: relative(skillDir, file) },
						});
					}
				}
			},
		};
	},
};

export default rule;
