/**
 * @fileoverview Require large reference files to include a table of contents.
 *
 * Official guidance: reference files over ~300 lines should include a table of
 * contents so Claude can navigate to the relevant section instead of reading
 * (or partially reading) the whole file.
 */

import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Heading, Link } from "mdast";

import { isReferenceFile } from "../utils/skill-file";
import { collect, textContent } from "../utils/ast";

const DEFAULT_MAX_LINES = 300;
const TOC_HEADING = /^(table of contents|contents|toc)$/i;

const rule: MarkdownRuleDefinition<{
	RuleOptions: [{ maxLines?: number }?];
	MessageIds: "missingToc";
}> = {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Require large reference files to include a table of contents",
			recommended: true,
			url: "https://github.com/weareikko/motto/blob/main/packages/eslint-plugin-skill/docs/rules/large-reference-toc.md",
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
			missingToc:
				"Reference file is {{lines}} lines; add a table of contents (over {{max}} lines).",
		},
	},

	create(context) {
		if (!isReferenceFile(context.filename)) {
			return {};
		}
		const max = context.options[0]?.maxLines ?? DEFAULT_MAX_LINES;

		return {
			root(root) {
				const lines = root.position?.end?.line ?? 0;
				if (lines <= max) {
					return;
				}

				const headings = collect<Heading>(root, "heading");
				const hasTocHeading = headings.some((h) =>
					TOC_HEADING.test(textContent(h).trim()),
				);
				// A cluster of in-page anchor links also counts as a TOC.
				const anchorLinks = collect<Link>(root, "link").filter((n) =>
					n.url.startsWith("#"),
				);
				const hasAnchorToc = anchorLinks.length >= 3;

				if (!hasTocHeading && !hasAnchorToc) {
					context.report({
						loc: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } },
						messageId: "missingToc",
						data: { lines, max },
					});
				}
			},
		};
	},
};

export default rule;
