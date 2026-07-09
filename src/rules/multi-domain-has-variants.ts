/**
 * @fileoverview Expect a multi-domain skill to carry at least two variant references.
 *
 * Opt-in: only fires when the skill explicitly declares itself as
 * `metadata.kind: multi-domain`. The multi-domain pattern (e.g.
 * `references/{aws,gcp,azure}.md`, with `SKILL.md` holding the selection
 * logic) only earns its complexity when there is more than one variant to
 * select between.
 */

import { dirname } from "node:path";

import type { MarkdownRuleDefinition } from "@eslint/markdown";

import { isSkillFile } from "../utils/skill-file";
import { parseFrontmatter } from "../utils/frontmatter";
import { findFrontmatter } from "../utils/ast";
import { declaredKind } from "../utils/kind";
import { referenceMarkdownFiles } from "../utils/references";

const TOP = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };
const MIN_VARIANTS = 2;

const rule: MarkdownRuleDefinition<{
	RuleOptions: [];
	MessageIds: "tooFewVariants";
}> = {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Expect a multi-domain skill to carry at least two variant references",
			recommended: false,
			url: "https://github.com/ikko-dev/eslint-plugin-skill/blob/main/docs/rules/multi-domain-has-variants.md",
		},
		schema: [],
		messages: {
			tooFewVariants:
				"Skill is declared `metadata.kind: multi-domain` but has fewer than {{min}} reference files to select between.",
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
				if (declaredKind(data) !== "multi-domain") {
					return;
				}
				if (referenceMarkdownFiles(skillDir).length < MIN_VARIANTS) {
					context.report({
						loc: TOP,
						messageId: "tooFewVariants",
						data: { min: MIN_VARIANTS },
					});
				}
			},
		};
	},
};

export default rule;
