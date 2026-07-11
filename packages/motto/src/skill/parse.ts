/**
 * Parse a Claude Code Agent Skill (`SKILL.md`) into its addressable parts.
 *
 * A skill is a directory containing a `SKILL.md` with YAML frontmatter
 * (`name`, `description`, optional `metadata`) and a markdown body, plus any
 * on-demand reference files linked from the body. This parser is deliberately
 * standalone (no mdast/eslint dependency) so the `motto` CLI stays light — it
 * only needs the frontmatter fields, the body, and the set of local files the
 * body links to (the progressive-disclosure surface).
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, join, relative, isAbsolute } from "node:path";
import { parse as parseYaml } from "yaml";

export interface SkillReference {
	/** Link target exactly as written in the body, e.g. `references/db.md`. */
	target: string;
	/** Path relative to the skill directory (POSIX-style). */
	relPath: string;
	/** Absolute path on disk. */
	absPath: string;
	/** Whether the target resolves to an existing file. */
	exists: boolean;
}

export interface ParsedSkill {
	/** Absolute path to the resolved SKILL.md. */
	path: string;
	/** Absolute path to the skill directory. */
	dir: string;
	/** Raw file contents. */
	raw: string;
	/** Parsed YAML frontmatter (empty object if none). */
	frontmatter: Record<string, unknown>;
	/** `name` field (empty string if absent). */
	name: string;
	/** `description` field (empty string if absent). */
	description: string;
	/** `metadata.kind` if present (procedural | reference | ...). */
	kind?: string;
	/** Markdown body with the frontmatter block stripped. */
	body: string;
	/** Local files linked from the body (de-duplicated, in first-seen order). */
	references: SkillReference[];
}

const FRONTMATTER_RE = /^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** Split a raw SKILL.md into `{ frontmatter, body }`. */
export function splitFrontmatter(raw: string): {
	frontmatter: Record<string, unknown>;
	body: string;
} {
	const match = raw.match(FRONTMATTER_RE);
	if (!match) return { frontmatter: {}, body: raw };
	let parsed: unknown;
	try {
		parsed = parseYaml(match[1]);
	} catch {
		parsed = {};
	}
	const frontmatter =
		parsed && typeof parsed === "object" && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: {};
	return { frontmatter, body: raw.slice(match[0].length) };
}

/** Extract markdown link targets `[text](target)` from a body, in order. */
export function extractLinkTargets(body: string): string[] {
	const targets: string[] = [];
	// Skip fenced code blocks so example links aren't counted as real refs.
	const withoutFences = body.replace(/```[\s\S]*?```/g, "");
	const linkRe = /\[[^\]]*\]\(([^)]+)\)/g;
	let m: RegExpExecArray | null;
	while ((m = linkRe.exec(withoutFences)) !== null) {
		targets.push(m[1].trim());
	}
	return targets;
}

/** True for link targets that point at a local file (not a URL or anchor). */
function isLocalFileTarget(target: string): boolean {
	if (!target) return false;
	if (target.startsWith("#")) return false; // in-page anchor
	if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return false; // scheme: http:, mailto:, etc.
	if (target.startsWith("//")) return false; // protocol-relative URL
	return true;
}

/** Strip any `#anchor` / `?query` suffix from a link target. */
function cleanTarget(target: string): string {
	return target.replace(/[#?].*$/, "");
}

/** Resolve a skill path (a directory or a SKILL.md file) to the SKILL.md file. */
export function resolveSkillPath(inputPath: string): string {
	const abs = resolve(inputPath);
	if (existsSync(abs) && statSync(abs).isDirectory()) {
		return join(abs, "SKILL.md");
	}
	return abs;
}

/** Read and parse a skill from a directory path or a SKILL.md path. */
export function parseSkill(inputPath: string): ParsedSkill {
	const path = resolveSkillPath(inputPath);
	if (!existsSync(path)) {
		throw new Error(`No SKILL.md found at ${path}`);
	}
	const dir = dirname(path);
	const raw = readFileSync(path, "utf8");
	const { frontmatter, body } = splitFrontmatter(raw);

	const name = typeof frontmatter.name === "string" ? frontmatter.name : "";
	const description =
		typeof frontmatter.description === "string" ? frontmatter.description : "";
	const metadata = frontmatter.metadata;
	const kind =
		metadata && typeof metadata === "object" && !Array.isArray(metadata)
			? typeof (metadata as Record<string, unknown>).kind === "string"
				? ((metadata as Record<string, unknown>).kind as string)
				: undefined
			: undefined;

	const seen = new Set<string>();
	const references: SkillReference[] = [];
	for (const rawTarget of extractLinkTargets(body)) {
		const target = cleanTarget(rawTarget);
		if (!isLocalFileTarget(target) || seen.has(target)) continue;
		seen.add(target);
		const absPath = isAbsolute(target) ? target : resolve(dir, target);
		const rel = relative(dir, absPath).split("\\").join("/");
		references.push({
			target,
			relPath: rel,
			absPath,
			exists: existsSync(absPath) && statSync(absPath).isFile(),
		});
	}

	return { path, dir, raw, frontmatter, name, description, kind, body, references };
}
