/**
 * @fileoverview Disallow HTML/XML tags in the skill `description`.
 *
 * Descriptions are consumed as plain routing text. Embedded tags add noise and
 * can interfere with how the description is parsed and displayed.
 */

import { isSkillFile } from "../utils/skill-file.js";
import { parseFrontmatter } from "../utils/frontmatter.js";
import { findFrontmatter } from "../utils/ast.js";

// Matches an opening, closing, or self-closing tag such as <b>, </b>, <br/>,
// or <role attr="x">. Deliberately conservative: requires a letter after `<`.
const TAG = /<\/?[a-zA-Z][^>]*>/;

/** @type {import("eslint").Rule.RuleModule} */
export default {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow HTML/XML tags in the skill `description`",
			recommended: true,
			url: "https://github.com/ikko-dev/motto/blob/main/docs/rules/description-no-html.md",
		},
		schema: [],
		messages: {
			hasTag:
				"Skill `description` must not contain HTML/XML tags (found `{{tag}}`).",
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
				if (!data || typeof data.description !== "string") {
					return;
				}
				const match = TAG.exec(data.description);
				if (match) {
					context.report({
						loc: keyLoc("description"),
						messageId: "hasTag",
						data: { tag: match[0] },
					});
				}
			},
		};
	},
};
