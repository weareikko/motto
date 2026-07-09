/**
 * @fileoverview Require `name` and `description` frontmatter on a skill.
 */

import type { MarkdownRuleDefinition } from "@eslint/markdown";

import { isSkillFile } from "../utils/skill-file";
import { parseFrontmatter } from "../utils/frontmatter";
import { findFrontmatter } from "../utils/ast";

const TOP = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };

type MessageIds =
	| "missingFrontmatter"
	| "invalidFrontmatter"
	| "missingKey"
	| "emptyKey";

const rule: MarkdownRuleDefinition<{ RuleOptions: []; MessageIds: MessageIds }> =
	{
		meta: {
			type: "problem",
			docs: {
				description:
					"Require `name` and `description` frontmatter on a skill",
				recommended: true,
				url: "https://github.com/ikko-dev/eslint-plugin-skill/blob/main/docs/rules/require-frontmatter.md",
			},
			schema: [],
			messages: {
				missingFrontmatter:
					"SKILL.md must start with YAML frontmatter containing `name` and `description`.",
				invalidFrontmatter:
					"Skill frontmatter is not valid YAML: {{reason}}",
				missingKey: "Skill frontmatter is missing a `{{key}}` field.",
				emptyKey: "Skill frontmatter field `{{key}}` must not be empty.",
			},
		},

		create(context) {
			if (!isSkillFile(context.filename)) {
				return {};
			}

			return {
				root(root) {
					const node = findFrontmatter(root);
					if (!node) {
						context.report({ loc: TOP, messageId: "missingFrontmatter" });
						return;
					}

					const { data, error, keyLoc } = parseFrontmatter(node);
					if (error || !data) {
						context.report({
							loc: node.position ?? TOP,
							messageId: "invalidFrontmatter",
							data: { reason: error ?? "unknown error" },
						});
						return;
					}

					for (const key of ["name", "description"]) {
						if (!(key in data)) {
							context.report({
								loc: node.position ?? TOP,
								messageId: "missingKey",
								data: { key },
							});
							continue;
						}
						const value = data[key];
						if (typeof value !== "string" || value.trim() === "") {
							context.report({
								loc: keyLoc(key),
								messageId: "emptyKey",
								data: { key },
							});
						}
					}
				},
			};
		},
	};

export default rule;
