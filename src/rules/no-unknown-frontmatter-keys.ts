/**
 * @fileoverview Flag unknown top-level frontmatter keys on a skill.
 *
 * The Agent Skills standard defines a fixed set of frontmatter fields
 * (`name` + `description` required; a handful of optional ones). An unexpected
 * key is almost always a typo (`descriptoin`) or a misplaced field, which the
 * runtime silently ignores — so it never takes effect and is easy to miss.
 * Extra keys can be allowed explicitly via the `allow` option.
 */

import type { MarkdownRuleDefinition } from "@eslint/markdown";

import { isSkillFile } from "../utils/skill-file";
import { parseFrontmatter } from "../utils/frontmatter";
import { findFrontmatter } from "../utils/ast";

// Required + optional keys defined by the Agent Skills standard and the
// Claude Code extensions to it.
const KNOWN_KEYS = new Set([
	"name",
	"description",
	"license",
	"compatibility",
	"metadata",
	"allowed-tools",
	"when_to_use",
	"disable-model-invocation",
	// Claude Code command/skill extensions.
	"argument-hint",
	"model",
	"context",
]);

const rule: MarkdownRuleDefinition<{
	RuleOptions: [{ allow?: string[] }?];
	MessageIds: "unknownKey";
}> = {
	meta: {
		type: "problem",
		docs: {
			description: "Flag unknown top-level frontmatter keys on a skill",
			recommended: true,
			url: "https://github.com/ikko-dev/eslint-plugin-skill/blob/main/docs/rules/no-unknown-frontmatter-keys.md",
		},
		schema: [
			{
				type: "object",
				properties: {
					allow: {
						type: "array",
						items: { type: "string" },
					},
				},
				additionalProperties: false,
			},
		],
		messages: {
			unknownKey:
				"Unknown frontmatter key `{{key}}` — likely a typo or an ignored field.",
		},
	},

	create(context) {
		if (!isSkillFile(context.filename)) {
			return {};
		}
		const allow = new Set(context.options[0]?.allow ?? []);

		return {
			root(root) {
				const node = findFrontmatter(root);
				if (!node) {
					return;
				}
				const { data, keyLoc } = parseFrontmatter(node);
				if (!data) {
					return;
				}
				for (const key of Object.keys(data)) {
					if (KNOWN_KEYS.has(key) || allow.has(key)) {
						continue;
					}
					context.report({
						loc: keyLoc(key),
						messageId: "unknownKey",
						data: { key },
					});
				}
			},
		};
	},
};

export default rule;
