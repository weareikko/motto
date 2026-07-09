/**
 * @fileoverview Validate the shape of the optional `allowed-tools` frontmatter field.
 *
 * `allowed-tools` (a Claude Code extension to the Agent Skills standard) must
 * be a non-empty array of non-empty strings when present. An empty array
 * grants no tools at all — almost certainly not the intent — and a non-array
 * value is silently ignored by the runtime.
 */

import type { MarkdownRuleDefinition } from "@eslint/markdown";

import { isSkillFile } from "../utils/skill-file";
import { parseFrontmatter } from "../utils/frontmatter";
import { findFrontmatter } from "../utils/ast";

const rule: MarkdownRuleDefinition<{
	RuleOptions: [];
	MessageIds: "notArray" | "empty" | "invalidEntry";
}> = {
	meta: {
		type: "problem",
		docs: {
			description:
				"Validate the shape of the optional `allowed-tools` frontmatter field",
			recommended: true,
			url: "https://github.com/ikko-dev/eslint-plugin-skill/blob/main/docs/rules/valid-allowed-tools.md",
		},
		schema: [],
		messages: {
			notArray: "`allowed-tools` must be an array of tool names.",
			empty: "`allowed-tools` must not be empty; omit the field to allow all tools.",
			invalidEntry: "`allowed-tools` entries must be non-empty strings.",
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
				if (!data || !("allowed-tools" in data)) {
					return;
				}
				const value = data["allowed-tools"];
				const loc = keyLoc("allowed-tools");

				if (!Array.isArray(value)) {
					context.report({ loc, messageId: "notArray" });
					return;
				}
				if (value.length === 0) {
					context.report({ loc, messageId: "empty" });
					return;
				}
				if (value.some((v) => typeof v !== "string" || v.trim() === "")) {
					context.report({ loc, messageId: "invalidEntry" });
				}
			},
		};
	},
};

export default rule;
