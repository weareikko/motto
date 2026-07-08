/**
 * @fileoverview Flag relative links/images whose target does not exist on disk.
 *
 * Skills lean on referenced files for progressive disclosure; a dead relative
 * link means the agent will try to open something that isn't there. Absolute
 * URLs (`https:`, `mailto:`) and pure anchors (`#section`) are ignored.
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Image, Link } from "mdast";

import { isSkillFile } from "../utils/skill-file";
import { collect } from "../utils/ast";

function isRelative(url: string): boolean {
	if (!url || url.startsWith("#")) {
		return false;
	}
	// Protocol-relative or has a scheme (http:, https:, mailto:, tel:, data:…).
	if (url.startsWith("//") || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
		return false;
	}
	return true;
}

/**
 * Strip URL fragment and query so the filesystem target can be resolved.
 */
function toPath(url: string): string {
	let path = url;
	const hash = path.indexOf("#");
	if (hash !== -1) {
		path = path.slice(0, hash);
	}
	const query = path.indexOf("?");
	if (query !== -1) {
		path = path.slice(0, query);
	}
	try {
		return decodeURIComponent(path);
	} catch {
		return path;
	}
}

const rule: MarkdownRuleDefinition<{
	RuleOptions: [];
	MessageIds: "broken";
}> = {
	meta: {
		type: "problem",
		docs: {
			description:
				"Flag relative links/images whose target does not exist on disk",
			recommended: true,
			url: "https://github.com/ikko-dev/eslint-plugin-skill/blob/main/docs/rules/no-broken-relative-links.md",
		},
		schema: [],
		messages: {
			broken:
				"Relative {{kind}} target `{{url}}` does not exist relative to this skill.",
		},
	},

	create(context) {
		if (!isSkillFile(context.filename)) {
			return {};
		}
		const baseDir = dirname(context.filename);
		// Without a resolvable path we cannot check the filesystem.
		if (!baseDir || baseDir === "." || context.filename === "<input>") {
			return {};
		}

		return {
			root(root) {
				const nodes: { node: Link | Image; kind: "link" | "image" }[] = [
					...collect<Link>(root, "link").map((node) => ({
						node,
						kind: "link" as const,
					})),
					...collect<Image>(root, "image").map((node) => ({
						node,
						kind: "image" as const,
					})),
				];
				for (const { node, kind } of nodes) {
					const url = typeof node.url === "string" ? node.url : "";
					if (!isRelative(url) || !node.position) {
						continue;
					}
					const target = resolve(baseDir, toPath(url));
					if (!existsSync(target)) {
						context.report({
							loc: node.position,
							messageId: "broken",
							data: { kind, url },
						});
					}
				}
			},
		};
	},
};

export default rule;
