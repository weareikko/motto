/**
 * @fileoverview Require reference files to have descriptive names.
 *
 * Claude decides whether to open a reference file partly from its name, so
 * generic names like `doc2.md` or `untitled.md` carry no signal. Official
 * guidance: name files descriptively (`form_validation_rules.md`, not
 * `doc2.md`).
 */

import type { MarkdownRuleDefinition } from "@eslint/markdown";

import { isReferenceFile, basename } from "../utils/skill-file";

// Generic, low-signal stems: doc, ref, reference, file, page, untitled, temp,
// tmp, new, copy, note(s), document — optionally suffixed with a number.
const GENERIC =
	/^(docs?|references?|files?|pages?|untitled|temp|tmp|new|copy|notes?|documents?)[-_ ]?\d*$/i;
// A bare number like `1.md` or `01.md`.
const NUMERIC = /^\d+$/;

const rule: MarkdownRuleDefinition<{
	RuleOptions: [];
	MessageIds: "generic";
}> = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Require reference files to have descriptive names",
			recommended: true,
			url: "https://github.com/weareikko/motto/blob/main/packages/eslint-plugin-skill/docs/rules/descriptive-reference-filenames.md",
		},
		schema: [],
		messages: {
			generic:
				"Reference file `{{name}}` has a generic name; use a descriptive one (e.g. `form_validation_rules.md`).",
		},
	},

	create(context) {
		if (!isReferenceFile(context.filename)) {
			return {};
		}
		const name = basename(context.filename);
		const stem = name.replace(/\.md$/i, "");

		return {
			root() {
				if (GENERIC.test(stem) || NUMERIC.test(stem)) {
					context.report({
						loc: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } },
						messageId: "generic",
						data: { name },
					});
				}
			},
		};
	},
};

export default rule;
