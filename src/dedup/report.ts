/**
 * Human-readable rendering of an analysis result.
 */

import type { AnalyzeResult } from "./types";

export function formatReport(result: AnalyzeResult): string {
	const lines: string[] = [];

	for (const d of result.duplicates) {
		lines.push(
			`warn  duplicate    references/${d.relPath} is byte-identical across: ${d.files
				.map((f) => f.skillName)
				.join(", ")} — consider consolidating into a shared location.`,
		);
	}

	for (const d of result.divergences) {
		const groups = d.groups
			.map((g) => `[${g.files.map((f) => f.skillName).join(", ")}]`)
			.join(" vs ");
		lines.push(
			`error divergence   references/${d.relPath} has DIFFERENT content across skills: ${groups} — reconcile or rename.`,
		);
	}

	for (const n of result.nearDuplicates) {
		lines.push(
			`warn  near-dup     ${n.fileA.skillName}/references/${n.fileA.relPath} ~ ${n.fileB.skillName}/references/${n.fileB.relPath} (${Math.round(n.similarity * 100)}% similar) — consider sharing instead of duplicating.`,
		);
	}

	if (lines.length === 0) {
		lines.push("No cross-skill reference duplication or drift found.");
	}

	const summary = `\n${result.duplicates.length} duplicate(s), ${result.divergences.length} divergence(s), ${result.nearDuplicates.length} near-duplicate(s).`;
	return lines.join("\n") + summary;
}
