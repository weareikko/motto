/**
 * @fileoverview Keep the skill body short to preserve progressive disclosure.
 *
 * A SKILL.md is an entry point, not a manual: heavy detail belongs in
 * referenced files that are loaded on demand. This rule flags bodies that grow
 * past a line budget (frontmatter excluded).
 */

import { isSkillFile } from "../utils/skill-file.js";
import { findFrontmatter } from "../utils/ast.js";

const DEFAULT_MAX_LINES = 500;

/** @type {import("eslint").Rule.RuleModule} */
export default {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Keep the skill body short to preserve progressive disclosure",
			recommended: true,
			url: "https://github.com/ikko-dev/eslint-plugin-skill/blob/main/docs/rules/body-max-length.md",
		},
		schema: [
			{
				type: "object",
				properties: {
					maxLines: { type: "integer", minimum: 1 },
				},
				additionalProperties: false,
			},
		],
		messages: {
			tooLong:
				"Skill body is {{lines}} lines; keep it at or under {{max}} and move detail into referenced files.",
		},
	},

	create(context) {
		if (!isSkillFile(context.filename)) {
			return {};
		}
		const max = context.options?.[0]?.maxLines ?? DEFAULT_MAX_LINES;

		return {
			root(root) {
				const totalLines = root.position?.end?.line ?? 0;
				const fm = findFrontmatter(root);
				const bodyStart = fm ? (fm.position?.end?.line ?? 0) : 0;
				const bodyLines = Math.max(0, totalLines - bodyStart);
				if (bodyLines > max) {
					context.report({
						loc: {
							start: { line: bodyStart + 1, column: 1 },
							end: { line: totalLines, column: 1 },
						},
						messageId: "tooLong",
						data: { lines: String(bodyLines), max: String(max) },
					});
				}
			},
		};
	},
};
