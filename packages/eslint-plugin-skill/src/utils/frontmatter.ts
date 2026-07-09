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

import type { Yaml } from "mdast";
import { parse as parseYaml } from "yaml";

import type { SourceRange } from "../types";

export interface Frontmatter {
	/** Parsed frontmatter object, or `null` when it isn't a mapping. */
	data: Record<string, unknown> | null;
	/** Parse error message, if any. */
	error: string | null;
	/** The raw YAML text (fences excluded). */
	raw: string;
	/** Best-effort source location for a top-level key. */
	keyLoc: (key: string) => SourceRange;
}

export function parseFrontmatter(node: Yaml): Frontmatter {
	const raw = typeof node.value === "string" ? node.value : "";
	const baseLine = node.position?.start?.line ?? 1;
	// Content begins one line after the opening `---` fence.
	const contentStartLine = baseLine + 1;
	const nodeLoc: SourceRange = node.position ?? {
		start: { line: 1, column: 1 },
		end: { line: 1, column: 1 },
	};

	let data: Record<string, unknown> | null = null;
	let error: string | null = null;
	try {
		const parsed: unknown = parseYaml(raw);
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			data = parsed as Record<string, unknown>;
		} else if (parsed === null || parsed === undefined) {
			data = {};
		} else {
			error = "frontmatter is not a key/value mapping";
		}
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
	}

	const lines = raw.split("\n");

	function keyLoc(key: string): SourceRange {
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

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
