/**
 * @fileoverview Flag relative links/images whose target does not exist on disk.
 *
 * Skills lean on referenced files for progressive disclosure; a dead relative
 * link means the agent will try to open something that isn't there. Absolute
 * URLs (`https:`, `mailto:`) and pure anchors (`#section`) are ignored.
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { isSkillFile } from "../utils/skill-file.js";
import { collect } from "../utils/ast.js";

/**
 * @param {string} url
 * @returns {boolean}
 */
function isRelative(url) {
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
 *
 * @param {string} url
 * @returns {string}
 */
function toPath(url) {
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

/** @type {import("eslint").Rule.RuleModule} */
export default {
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
				const nodes = [
					...collect(root, "link").map(n => ({ n, kind: "link" })),
					...collect(root, "image").map(n => ({ n, kind: "image" })),
				];
				for (const { n, kind } of nodes) {
					const url = typeof n.url === "string" ? n.url : "";
					if (!isRelative(url)) {
						continue;
					}
					const target = resolve(baseDir, toPath(url));
					if (!existsSync(target)) {
						context.report({
							loc: n.position,
							messageId: "broken",
							data: { kind, url },
						});
					}
				}
			},
		};
	},
};
