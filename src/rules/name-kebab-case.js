/**
 * @fileoverview Require the skill `name` to be letter-start kebab-case.
 */

import { isSkillFile } from "../utils/skill-file.js";
import { parseFrontmatter } from "../utils/frontmatter.js";
import { findFrontmatter } from "../utils/ast.js";

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** @type {import("eslint").Rule.RuleModule} */
export default {
	meta: {
		type: "problem",
		docs: {
			description: "Require the skill `name` to be letter-start kebab-case",
			recommended: true,
			url: "https://github.com/ikko-dev/eslint-plugin-skill/blob/main/docs/rules/name-kebab-case.md",
		},
		schema: [],
		messages: {
			notKebab:
				"Skill `name` must be letter-start kebab-case (e.g. `my-skill`), got `{{name}}`.",
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
				if (!KEBAB.test(data.name)) {
					context.report({
						loc: keyLoc("name"),
						messageId: "notKebab",
						data: { name: data.name },
					});
				}
			},
		};
	},
};
