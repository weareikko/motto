/**
 * @fileoverview Require the body H1 to correspond to the skill `name`.
 *
 * The comparison is normalized so both `# my-skill` and `# My Skill` are
 * accepted for `name: my-skill`.
 */

import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Heading } from "mdast";

import { isSkillFile } from "../utils/skill-file";
import { parseFrontmatter } from "../utils/frontmatter";
import { findFrontmatter, collect, textContent } from "../utils/ast";

function normalize(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

const rule: MarkdownRuleDefinition<{
	RuleOptions: [];
	MessageIds: "mismatch";
}> = {
	meta: {
		type: "suggestion",
		docs: {
			// Opt-in: not part of any preset. The standard format neither
			// requires an H1 nor ties it to `name` (which is a display label).
			description: "Require the body H1 to correspond to the skill `name`",
			recommended: false,
			url: "https://github.com/ikko-dev/eslint-plugin-skill/blob/main/docs/rules/h1-matches-name.md",
		},
		schema: [],
		messages: {
			mismatch:
				"Body H1 (`{{title}}`) should correspond to the skill `name` (`{{name}}`).",
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
				const { data } = parseFrontmatter(node);
				if (!data || typeof data.name !== "string" || data.name === "") {
					return;
				}
				const h1 = collect<Heading>(root, "heading").find(
					(h) => h.depth === 1,
				);
				if (!h1 || !h1.position) {
					return; // `no-multiple-h1` owns the heading-structure cases.
				}
				const title = textContent(h1).trim();
				if (normalize(title) !== normalize(data.name)) {
					context.report({
						loc: h1.position,
						messageId: "mismatch",
						data: { title, name: data.name },
					});
				}
			},
		};
	},
};

export default rule;
