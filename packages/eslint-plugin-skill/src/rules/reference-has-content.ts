/**
 * @fileoverview Expect a reference skill to carry at least one reference file.
 *
 * Opt-in: only fires when the skill explicitly declares itself as
 * `metadata.kind: reference`. A reference (domain-knowledge) skill exists to
 * supply background material on demand; a declared reference skill with an
 * empty or missing `references/` directory has nothing to supply.
 */

import { dirname } from "node:path";

import type { MarkdownRuleDefinition } from "@eslint/markdown";

import { isSkillFile } from "../utils/skill-file";
import { parseFrontmatter } from "../utils/frontmatter";
import { findFrontmatter } from "../utils/ast";
import { declaredKind } from "../utils/kind";
import { referenceMarkdownFiles } from "../utils/references";
import { skillFs } from "../utils/skill-fs";

const TOP = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };

const rule: MarkdownRuleDefinition<{
	RuleOptions: [];
	MessageIds: "noReferences";
}> = {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Expect a reference skill to carry at least one reference file",
			recommended: false,
			url: "https://github.com/ikko-dev/eslint-plugin-skill/blob/main/docs/rules/reference-has-content.md",
		},
		schema: [],
		messages: {
			noReferences:
				"Skill is declared `metadata.kind: reference` but its `references/` directory is empty or missing.",
		},
	},

	create(context) {
		if (!isSkillFile(context.filename)) {
			return {};
		}
		const skillDir = dirname(context.filename);
		if (!skillDir || skillDir === "." || context.filename === "<input>") {
			return {};
		}

		return {
			root(root) {
				const node = findFrontmatter(root);
				if (!node) {
					return;
				}
				const { data } = parseFrontmatter(node);
				if (declaredKind(data) !== "reference") {
					return;
				}
				if (referenceMarkdownFiles(skillDir, skillFs(context.settings)).length === 0) {
					context.report({ loc: TOP, messageId: "noReferences" });
				}
			},
		};
	},
};

export default rule;
