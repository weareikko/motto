/**
 * Parse the YAML frontmatter of a skill and resolve source locations for
 * individual keys, so rules can report precise `loc` ranges.
 *
 * `@eslint/markdown` (with `languageOptions.frontmatter: "yaml"`) surfaces
 * frontmatter as a single `yaml` mdast node whose `.value` is the raw YAML text
 * *without* the enclosing `---` fences. The node's `position.start.line` points
 * at the opening fence, so a key found on line `i` (0-indexed) of `.value` sits
 * on file line `node.position.start.line + 1 + i`.
 */

import { parse as parseYaml } from "yaml";

/**
 * @typedef {Object} Frontmatter
 * @property {Record<string, unknown> | null} data Parsed frontmatter object,
 *   or `null` when the YAML could not be parsed as a mapping.
 * @property {string | null} error Parse error message, if any.
 * @property {string} raw The raw YAML text (fences excluded).
 * @property {(key: string) => {start: {line:number,column:number}, end: {line:number,column:number}}} keyLoc
 *   Best-effort source location for a top-level key; falls back to the node's
 *   own location when the key can't be found textually.
 */

/**
 * @param {import("mdast").Yaml} node The `yaml` frontmatter node.
 * @returns {Frontmatter}
 */
export function parseFrontmatter(node) {
	const raw = typeof node.value === "string" ? node.value : "";
	const baseLine = node.position?.start?.line ?? 1;
	// Content begins one line after the opening `---` fence.
	const contentStartLine = baseLine + 1;
	const nodeLoc = node.position ?? {
		start: { line: 1, column: 1 },
		end: { line: 1, column: 1 },
	};

	let data = null;
	let error = null;
	try {
		const parsed = parseYaml(raw);
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			data = parsed;
		} else if (parsed === null || parsed === undefined) {
			data = {};
		} else {
			error = "frontmatter is not a key/value mapping";
		}
	} catch (e) {
		error = e && e.message ? e.message : String(e);
	}

	const lines = raw.split("\n");

	/** @type {Frontmatter["keyLoc"]} */
	function keyLoc(key) {
		const pattern = new RegExp(`^(\\s*)(${escapeRegExp(key)})\\s*:`);
		for (let i = 0; i < lines.length; i++) {
			const match = pattern.exec(lines[i]);
			if (match) {
				const line = contentStartLine + i;
				const column = match[1].length + 1;
				return {
					start: { line, column },
					end: { line, column: column + key.length },
				};
			}
		}
		return { start: nodeLoc.start, end: nodeLoc.end };
	}

	return { data, error, raw, keyLoc };
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
