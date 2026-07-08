/**
 * @fileoverview Require the `description` to express when the skill applies.
 *
 * An agent routes to a skill purely from its description. A description that
 * only says *what* the skill is, without signalling *when* to use it, routes
 * poorly. This rule checks for a trigger cue (configurable).
 */

import type { MarkdownRuleDefinition } from "@eslint/markdown";

import { isSkillFile } from "../utils/skill-file";
import { parseFrontmatter } from "../utils/frontmatter";
import { findFrontmatter } from "../utils/ast";

const DEFAULT_PATTERNS = [
	"use when",
	"use this when",
	"use for",
	"used when",
	"used for",
	"when the user",
	"when you",
	"when asked",
	"trigger",
	"invoke",
	"for when",
];

const rule: MarkdownRuleDefinition<{
	RuleOptions: [{ patterns?: string[] }?];
	MessageIds: "noTrigger";
}> = {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Require the `description` to express when the skill applies",
			recommended: true,
			url: "https://github.com/ikko-dev/eslint-plugin-skill/blob/main/docs/rules/description-has-trigger.md",
		},
		schema: [
			{
				type: "object",
				properties: {
					patterns: {
						type: "array",
						items: { type: "string" },
						minItems: 1,
					},
				},
				additionalProperties: false,
			},
		],
		messages: {
			noTrigger:
				"Skill `description` should state when to use the skill (e.g. a phrase like {{examples}}).",
		},
	},

	create(context) {
		if (!isSkillFile(context.filename)) {
			return {};
		}
		const patterns = context.options[0]?.patterns ?? DEFAULT_PATTERNS;
		const lowered = patterns.map((p) => p.toLowerCase());

		return {
			root(root) {
				const node = findFrontmatter(root);
				if (!node) {
					return;
				}
				const { data, keyLoc } = parseFrontmatter(node);
				if (
					!data ||
					typeof data.description !== "string" ||
					data.description.trim() === ""
				) {
					return;
				}
				const haystack = data.description.toLowerCase();
				const hasTrigger = lowered.some((p) => haystack.includes(p));
				if (!hasTrigger) {
					context.report({
						loc: keyLoc("description"),
						messageId: "noTrigger",
						data: {
							examples: patterns
								.slice(0, 2)
								.map((p) => `"${p}"`)
								.join(", "),
						},
					});
				}
			},
		};
	},
};

export default rule;
