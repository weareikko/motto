/**
 * Shared types for cross-skill reference de-duplication analysis.
 */

export interface ReferenceFile {
	/** Skill directory name (matches the skill's `name`/folder). */
	skillName: string;
	/** Absolute path to the skill's directory. */
	skillDir: string;
	/** Path of the reference file relative to its skill's `references/` dir. */
	relPath: string;
	/** Absolute path to the reference file. */
	absPath: string;
	/** Hash of the normalized content. */
	hash: string;
	/** Raw file content. */
	raw: string;
}

export interface FileRef {
	skillName: string;
	absPath: string;
}

export interface DuplicateFinding {
	type: "duplicate";
	severity: "warn";
	scope: string;
	relPath: string;
	hash: string;
	files: FileRef[];
}

export interface DivergenceFinding {
	type: "divergence";
	severity: "error";
	scope: string;
	relPath: string;
	/** One entry per distinct content hash found under this filename. */
	groups: { hash: string; files: FileRef[] }[];
}

export interface NearDuplicateFinding {
	type: "near-duplicate";
	severity: "warn";
	scope: string;
	fileA: FileRef & { relPath: string };
	fileB: FileRef & { relPath: string };
	similarity: number;
}

export type Finding = DuplicateFinding | DivergenceFinding | NearDuplicateFinding;

export interface AnalyzeOptions {
	/**
	 * How to group skills into comparison scopes.
	 * - "plugin" (default): skills sharing the same parent of the nearest
	 *   ancestor directory literally named `skills` are compared together
	 *   (e.g. sibling skills under one plugin's `skills/` dir). Skills with no
	 *   such ancestor fall back to a single scope keyed by the analysis root.
	 * - "repo": every discovered skill is compared in one global scope.
	 */
	scope?: "plugin" | "repo";
	/**
	 * Reference filenames (relative to each skill's `references/` dir) to
	 * exclude from duplicate/divergence detection — the escape hatch for
	 * deliberate, intentional divergence.
	 */
	ignoreRelPaths?: string[];
	/** Compute near-duplicate findings (different filenames, similar content). Off by default. */
	nearDuplicates?: boolean;
	/** Jaccard similarity threshold (0-1) above which two files are near-duplicates. */
	nearDuplicateThreshold?: number;
}

export interface AnalyzeResult {
	duplicates: DuplicateFinding[];
	divergences: DivergenceFinding[];
	nearDuplicates: NearDuplicateFinding[];
}
