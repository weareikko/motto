/**
 * @fileoverview Require reference links to stay one level deep from SKILL.md.
 *
 * Official guidance: every reference file should link directly from SKILL.md
 * and live at most one directory below it. Deeply nested reference chains are
 * an anti-pattern — Claude may only partially read (e.g. `head -100`) files
 * reached indirectly, so it can act on incomplete information.
 */

import type { MarkdownRuleDefinition } from "@eslint/markdown";

import { isSkillFile } from "../utils/skill-file";
import { collectLinkTargets, isRelativeUrl, urlToPath } from "../utils/links";

const rule: MarkdownRuleDefinition<{
	RuleOptions: [];
	MessageIds: "tooDeep" | "escapes";
}> = {
	meta: {
		type: "problem",
		docs: {
			description: "Require reference links to stay one level deep from SKILL.md",
			recommended: true,
			url: "https://github.com/weareikko/motto/blob/main/packages/eslint-plugin-skill/docs/rules/refs-one-level-deep.md",
		},
		schema: [],
		messages: {
			tooDeep:
				"Reference `{{url}}` is more than one directory deep; keep reference files one level below SKILL.md.",
			escapes:
				"Reference `{{url}}` points outside the skill directory; keep reference files one level below SKILL.md.",
		},
	},

	create(context) {
		if (!isSkillFile(context.filename)) {
			return {};
		}

		return {
			root(root) {
				for (const { node, url } of collectLinkTargets(root)) {
					if (!isRelativeUrl(url) || !node.position) {
						continue;
					}
					const segments = urlToPath(url)
						.split("/")
						.filter((s) => s && s !== ".");
					const dirs = segments.slice(0, -1);
					if (dirs.includes("..")) {
						context.report({
							loc: node.position,
							messageId: "escapes",
							data: { url },
						});
					} else if (dirs.length > 1) {
						context.report({
							loc: node.position,
							messageId: "tooDeep",
							data: { url },
						});
					}
				}
			},
		};
	},
};

export default rule;
