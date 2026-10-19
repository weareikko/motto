/**
 * @fileoverview Expect a procedural skill's body to contain ordered steps.
 *
 * Opt-in: only fires when the skill explicitly declares itself as
 * `metadata.kind: procedural`. A procedural (task/workflow) skill exists to
 * walk the agent through a sequence of actions; a declared procedural skill
 * with no ordered list at all is either mis-declared or missing its steps.
 */

import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { List } from "mdast";

import { isSkillFile } from "../utils/skill-file";
import { parseFrontmatter } from "../utils/frontmatter";
import { findFrontmatter, collect } from "../utils/ast";
import { declaredKind } from "../utils/kind";

const TOP = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };

const rule: MarkdownRuleDefinition<{
	RuleOptions: [];
	MessageIds: "noSteps";
}> = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Expect a procedural skill's body to contain ordered steps",
			recommended: false,
			url: "https://github.com/weareikko/motto/blob/main/packages/eslint-plugin-skill/docs/rules/procedural-has-steps.md",
		},
		schema: [],
		messages: {
			noSteps:
				"Skill is declared `metadata.kind: procedural` but its body has no ordered/numbered steps.",
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
				if (declaredKind(data) !== "procedural") {
					return;
				}
				const hasOrderedList = collect<List>(root, "list").some(
					(list) => list.ordered,
				);
				if (!hasOrderedList) {
					context.report({ loc: TOP, messageId: "noSteps" });
				}
			},
		};
	},
};

export default rule;
