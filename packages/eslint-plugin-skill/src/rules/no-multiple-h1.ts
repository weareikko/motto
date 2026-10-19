/**
 * @fileoverview Disallow more than one top-level H1 in the skill body.
 *
 * The standard skill format does not require an H1 — the official examples use
 * `##`-first bodies — so this rule does not demand a title. But two `#` H1s in
 * one body reads like separate documents merged together, so any H1 after the
 * first is flagged.
 */

import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Heading } from "mdast";

import { isSkillFile } from "../utils/skill-file";
import { collect } from "../utils/ast";

const rule: MarkdownRuleDefinition<{
	RuleOptions: [];
	MessageIds: "multiple";
}> = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow more than one top-level H1 in the skill body",
			recommended: true,
			url: "https://github.com/weareikko/motto/blob/main/packages/eslint-plugin-skill/docs/rules/no-multiple-h1.md",
		},
		schema: [],
		messages: {
			multiple:
				"Skill body must have at most one `#` H1 title; found {{count}}.",
		},
	},

	create(context) {
		if (!isSkillFile(context.filename)) {
			return {};
		}

		return {
			root(root) {
				const h1s = collect<Heading>(root, "heading").filter(
					(h) => h.depth === 1,
				);
				if (h1s.length > 1) {
					// Report each extra H1 after the first.
					for (const extra of h1s.slice(1)) {
						if (extra.position) {
							context.report({
								loc: extra.position,
								messageId: "multiple",
								data: { count: h1s.length },
							});
						}
					}
				}
			},
		};
	},
};

export default rule;
