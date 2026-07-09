/**
 * @fileoverview Cap the length of the skill `description`.
 *
 * The description is the only text an agent sees when deciding whether to load
 * a skill, so it must stay compact. The default ceiling mirrors the documented
 * 1024-character frontmatter budget.
 */

import type { MarkdownRuleDefinition } from "@eslint/markdown";

import { isSkillFile } from "../utils/skill-file";
import { parseFrontmatter } from "../utils/frontmatter";
import { findFrontmatter } from "../utils/ast";

const DEFAULT_MAX = 1024;

const rule: MarkdownRuleDefinition<{
	RuleOptions: [{ max?: number }?];
	MessageIds: "tooLong";
}> = {
	meta: {
		type: "problem",
		docs: {
			description: "Cap the length of the skill `description`",
			recommended: true,
			url: "https://github.com/ikko-dev/eslint-plugin-skill/blob/main/docs/rules/description-length.md",
		},
		schema: [
			{
				type: "object",
				properties: {
					max: { type: "integer", minimum: 1 },
				},
				additionalProperties: false,
			},
		],
		messages: {
			tooLong:
				"Skill `description` is {{length}} characters; keep it at or under {{max}}.",
		},
	},

	create(context) {
		if (!isSkillFile(context.filename)) {
			return {};
		}
		const max = context.options[0]?.max ?? DEFAULT_MAX;

		return {
			root(root) {
				const node = findFrontmatter(root);
				if (!node) {
					return;
				}
				const { data, keyLoc } = parseFrontmatter(node);
				if (!data || typeof data.description !== "string") {
					return;
				}
				const length = data.description.length;
				if (length > max) {
					context.report({
						loc: keyLoc("description"),
						messageId: "tooLong",
						data: { length, max },
					});
				}
			},
		};
	},
};

export default rule;
