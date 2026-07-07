/**
 * Helpers for recognizing and locating Claude Code skill files.
 *
 * Kept dependency-free and side-effect-free so the module ports cleanly to
 * oxlint's ESLint-compatible JS plugin runtime.
 */

/**
 * The canonical filename of a Claude Code Agent Skill.
 */
export const SKILL_FILENAME = "SKILL.md";

/**
 * Extract the basename of a POSIX or Windows path without relying on `node:path`,
 * so the logic is identical regardless of the host runtime's path semantics.
 *
 * @param {string} filename
 * @returns {string}
 */
export function basename(filename) {
	if (typeof filename !== "string") {
		return "";
	}
	const normalized = filename.replace(/\\/g, "/");
	const trimmed = normalized.endsWith("/")
		? normalized.slice(0, -1)
		: normalized;
	const slash = trimmed.lastIndexOf("/");
	return slash === -1 ? trimmed : trimmed.slice(slash + 1);
}

/**
 * The name of the directory that directly contains the given file.
 *
 * @param {string} filename
 * @returns {string}
 */
export function dirName(filename) {
	if (typeof filename !== "string") {
		return "";
	}
	const normalized = filename.replace(/\\/g, "/");
	const trimmed = normalized.endsWith("/")
		? normalized.slice(0, -1)
		: normalized;
	const slash = trimmed.lastIndexOf("/");
	if (slash === -1) {
		return "";
	}
	return basename(trimmed.slice(0, slash));
}

/**
 * Whether the linted file is a skill definition (`SKILL.md`).
 *
 * Rules call this first and no-op when it returns `false`, so the plugin is
 * safe even when its config globs every `*.md` file in a repository.
 *
 * @param {string} filename
 * @returns {boolean}
 */
export function isSkillFile(filename) {
	return basename(filename) === SKILL_FILENAME;
}
