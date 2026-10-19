/**
 * @fileoverview Require the skill `name` to be letter-start kebab-case.
 */

import type { MarkdownRuleDefinition } from "@eslint/markdown";

import { isSkillFile } from "../utils/skill-file";
import { parseFrontmatter } from "../utils/frontmatter";
import { findFrontmatter } from "../utils/ast";

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const MAX_LENGTH = 64;
// The Agent Skills spec forbids names built from reserved words.
const RESERVED = ["anthropic", "claude"];

const rule: MarkdownRuleDefinition<{
	RuleOptions: [];
	MessageIds: "notKebab" | "tooLong" | "reservedWord";
}> = {
	meta: {
		type: "problem",
		docs: {
			description:
				"Require the skill `name` to be a valid Agent Skills identifier",
			recommended: true,
			url: "https://github.com/weareikko/motto/blob/main/packages/eslint-plugin-skill/docs/rules/name-kebab-case.md",
		},
		schema: [],
		messages: {
			notKebab:
				"Skill `name` must be letter-start kebab-case (e.g. `my-skill`), got `{{name}}`.",
			tooLong:
				"Skill `name` must be at most {{max}} characters; got {{length}}.",
			reservedWord:
				"Skill `name` must not contain the reserved word `{{word}}`.",
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
					return;
				}
				const { data, keyLoc } = parseFrontmatter(node);
				if (!data || typeof data.name !== "string" || data.name === "") {
					return;
				}
				const name = data.name;
				const loc = keyLoc("name");

				if (!KEBAB.test(name)) {
					context.report({
						loc,
						messageId: "notKebab",
						data: { name },
					});
				}
				if (name.length > MAX_LENGTH) {
					context.report({
						loc,
						messageId: "tooLong",
						data: { max: MAX_LENGTH, length: name.length },
					});
				}
				const lowered = name.toLowerCase();
				const reserved = RESERVED.find((word) => lowered.includes(word));
				if (reserved) {
					context.report({
						loc,
						messageId: "reservedWord",
						data: { word: reserved },
					});
				}
			},
		};
	},
};

export default rule;
