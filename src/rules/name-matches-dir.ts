/**
 * @fileoverview Require the skill `name` to match its containing directory.
 */

import type { MarkdownRuleDefinition } from "@eslint/markdown";

import { isSkillFile, dirName } from "../utils/skill-file";
import { parseFrontmatter } from "../utils/frontmatter";
import { findFrontmatter } from "../utils/ast";

const rule: MarkdownRuleDefinition<{
	RuleOptions: [];
	MessageIds: "mismatch";
}> = {
	meta: {
		type: "problem",
		docs: {
			description:
				"Require the skill `name` to match its containing directory",
			recommended: true,
			url: "https://github.com/ikko-dev/eslint-plugin-skill/blob/main/docs/rules/name-matches-dir.md",
		},
		schema: [],
		messages: {
			mismatch:
				"Skill `name` (`{{name}}`) must match its directory name (`{{dir}}`).",
		},
	},

	create(context) {
		if (!isSkillFile(context.filename)) {
			return {};
		}
		const dir = dirName(context.filename);
		// Without a real path (e.g. RuleTester default `<input>`), there is no
		// directory to compare against.
		if (!dir) {
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
				if (data.name !== dir) {
					context.report({
						loc: keyLoc("name"),
						messageId: "mismatch",
						data: { name: data.name, dir },
					});
				}
			},
		};
	},
};

export default rule;
