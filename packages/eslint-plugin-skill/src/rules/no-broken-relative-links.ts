/**
 * @fileoverview Flag relative links/images whose target does not exist.
 *
 * Skills lean on referenced files for progressive disclosure; a dead relative
 * link means the agent will try to open something that isn't there. Absolute
 * URLs (`https:`, `mailto:`) and pure anchors (`#section`) are ignored.
 */

import { dirname, resolve } from "node:path";

import type { MarkdownRuleDefinition } from "@eslint/markdown";

import { isSkillFile } from "../utils/skill-file";
import { collectLinkTargets, isRelativeUrl, urlToPath } from "../utils/links";
import { skillFs } from "../utils/skill-fs";

const rule: MarkdownRuleDefinition<{
	RuleOptions: [];
	MessageIds: "broken";
}> = {
	meta: {
		type: "problem",
		docs: {
			description:
				"Flag relative links/images whose target does not exist",
			recommended: true,
			url: "https://github.com/ikko-dev/eslint-plugin-skill/blob/main/docs/rules/no-broken-relative-links.md",
		},
		schema: [],
		messages: {
			broken:
				"Relative {{kind}} target `{{url}}` does not exist relative to this skill.",
		},
	},

	create(context) {
		if (!isSkillFile(context.filename)) {
			return {};
		}
		const baseDir = dirname(context.filename);
		// Without a resolvable path we cannot check the filesystem.
		if (!baseDir || baseDir === "." || context.filename === "<input>") {
			return {};
		}

		const fs = skillFs(context.settings);

		return {
			root(root) {
				for (const { node, kind, url } of collectLinkTargets(root)) {
					if (!isRelativeUrl(url) || !node.position) {
						continue;
					}
					const target = resolve(baseDir, urlToPath(url));
					if (!fs.exists(target)) {
						context.report({
							loc: node.position,
							messageId: "broken",
							data: { kind, url },
						});
					}
				}
			},
		};
	},
};

export default rule;
