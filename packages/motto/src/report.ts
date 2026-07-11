/**
 * Render eval results for the terminal (and a JSON shape for `--json`).
 *
 * Deliberately dependency-free string formatting — no color/table library — so
 * the CLI stays light and the output pipes cleanly.
 */

import type { ParsedSkill } from "./skill/parse";
import type { SkillContract } from "./skill/contract";
import type { CostReport } from "./metrics/cost";

export interface EvalReport {
	skill: {
		name: string;
		description: string;
		kind?: string;
		path: string;
	};
	cost: CostReport;
	contract: SkillContract;
	/** Behavioral metrics, present only when a run actually happened. */
	behavioral?: {
		note: string;
	};
}

export function buildReport(
	skill: ParsedSkill,
	cost: CostReport,
	contract: SkillContract,
): EvalReport {
	return {
		skill: {
			name: skill.name,
			description: skill.description,
			kind: skill.kind,
			path: skill.path,
		},
		cost,
		contract,
	};
}

function n(value: number): string {
	return value.toLocaleString("en-US");
}

/** Human-readable cost section. */
export function formatCost(cost: CostReport): string {
	const lines: string[] = [];
	lines.push("cost (Claude tokenizer)");
	lines.push(
		`  index      ${n(cost.indexTokens).padStart(6)} tok  — name+description, loaded every request`,
	);
	lines.push(
		`  body       ${n(cost.bodyTokens).padStart(6)} tok  — SKILL.md body, loaded on trigger`,
	);
	if (cost.references.length) {
		lines.push(
			`  references ${n(cost.onDemandTotalTokens).padStart(6)} tok  — on demand across ${cost.references.length} file(s):`,
		);
		for (const ref of cost.references) {
			const label = ref.exists ? `${n(ref.tokens)} tok` : "MISSING";
			lines.push(`      ${ref.relPath} — ${label}`);
		}
	} else {
		lines.push("  references      0 tok  — none linked");
	}
	lines.push(
		`  worst case ${n(cost.worstCaseTokens).padStart(6)} tok  — SKILL.md + all references read`,
	);
	return lines.join("\n");
}

/** Human-readable contract section. */
export function formatContract(contract: SkillContract): string {
	const lines: string[] = [];
	lines.push("contract (derived from description)");
	lines.push(`  claim: ${contract.claim || "(none)"}`);
	if (contract.triggers.length) {
		lines.push(`  triggers (${contract.triggers.length}):`);
		for (const t of contract.triggers) lines.push(`      • ${t}`);
	} else if (!contract.hasTriggerCue) {
		lines.push(
			'  triggers: none — description has no "use when …" cue, so trigger',
		);
		lines.push(
			"            fidelity cannot be derived. Add a trigger clause to the",
		);
		lines.push("            description to make the skill testable.");
	}
	return lines.join("\n");
}

/** Full human-readable report. */
export function formatReport(report: EvalReport): string {
	const header = report.skill.name || "(unnamed skill)";
	const kind = report.skill.kind ? ` [${report.skill.kind}]` : "";
	const blocks = [
		`skill: ${header}${kind}`,
		`  ${report.skill.path}`,
		"",
		formatCost(report.cost),
		"",
		formatContract(report.contract),
	];
	if (report.behavioral) {
		blocks.push("", report.behavioral.note);
	} else {
		blocks.push(
			"",
			"behavioral (trigger + claim fidelity)",
			"  skipped — needs a harness and RUN_EVALS=1 (see `motto doctor`).",
		);
	}
	return blocks.join("\n");
}
