/**
 * @fileoverview Suggest a markdown table for a meta/router skill's dispatch list.
 *
 * Opt-in: only fires when the skill explicitly declares itself as
 * `metadata.kind: meta`. A meta (router) skill exists to dispatch requests to
 * other skills. A single-scenario empirical test (see
 * docs/research/meta-dispatch-table-vs-prose.md) found a markdown table costs
 * ~21% fewer tokens than equivalent prose for this kind of dispatch content,
 * with no measured routing-accuracy difference — so this is a cost-only
 * suggestion, not a correctness rule. Given that single-test evidence base,
 * this rule is deliberately kept out of every preset.
 */

import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Table } from "mdast";

import { isSkillFile } from "../utils/skill-file";
import { parseFrontmatter } from "../utils/frontmatter";
import { findFrontmatter, collect } from "../utils/ast";
import { declaredKind } from "../utils/kind";

const TOP = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };

const rule: MarkdownRuleDefinition<{
	RuleOptions: [];
	MessageIds: "preferTable";
}> = {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Suggest a markdown table for a meta/router skill's dispatch list",
			recommended: false,
			url: "https://github.com/weareikko/motto/blob/main/packages/eslint-plugin-skill/docs/rules/meta-prefers-dispatch-table.md",
		},
		schema: [],
		messages: {
			preferTable:
				"Skill is declared `metadata.kind: meta` with no markdown table; consider a table for the dispatch list — measured ~21% cheaper than prose with no accuracy difference (see docs/research/meta-dispatch-table-vs-prose.md).",
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
				if (declaredKind(data) !== "meta") {
					return;
				}
				if (collect<Table>(root, "table").length === 0) {
					context.report({ loc: TOP, messageId: "preferTable" });
				}
			},
		};
	},
};

export default rule;
