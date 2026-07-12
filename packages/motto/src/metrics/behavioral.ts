/**
 * Behavioral metrics — trigger fidelity and claim fidelity.
 *
 * Unlike cost, these require running the skill against real tasks on a real
 * agent harness (and, for claim fidelity, an LLM judge). They are therefore
 * gated behind harness/judge availability and `RUN_EVALS=1`, and cost money.
 *
 *   trigger fidelity — for each positive prompt derived from the description's
 *     "use when …" cue, does the agent actually engage the skill? Proxy: the
 *     harness reports it read the SKILL.md (or one of its references) while
 *     answering. Reported as a fire rate over N trials, never a single pass.
 *
 *   claim fidelity — on the runs where the skill fired, does the output do what
 *     the description's `claim` says it does? Judged 0/1 by the LLM judge.
 *
 * NOTE: this module is structurally complete but has NOT been validated against
 * live harness output — no credentials/spend were available when it was written
 * (matching the honesty bar of the harness adapters). Treat first live numbers
 * as suspect until the filesRead/judge wiring is confirmed end to end.
 */

import type { Harness } from "../harness/index";
import type { ParsedSkill } from "../skill/parse";
import type { SkillContract } from "../skill/contract";
import { judge, judgeAvailable } from "../judge/llm-judge";

export interface BehavioralOptions {
	harnesses: Harness[];
	model?: string;
	/** Trials per (harness × prompt). Default 20. */
	n?: number;
	timeoutMs?: number;
	judgeModel?: string;
}

export interface BehavioralRow {
	harness: string;
	/** Positive-prompt trials where the skill engaged. */
	fired: number;
	/** Fired-trials whose output the judge said fulfills the claim. */
	claimOk: number;
	/** Total positive-prompt trials attempted. */
	trials: number;
	/** Whether claim fidelity was scored (judge available). */
	claimJudged: boolean;
}

export interface BehavioralReport {
	rows: BehavioralRow[];
	n: number;
	promptCount: number;
}

/**
 * Did the agent engage the skill on this run? The ground-truth signal is an
 * explicit Skill invocation naming this skill (verified against live Claude
 * Code output) — NOT a Read of the SKILL.md file.
 */
function skillFired(result: { skillsInvoked: string[] }, skill: ParsedSkill): boolean {
	return result.skillsInvoked.some(
		(s) => s === skill.name || s.endsWith(`/${skill.name}`),
	);
}

/**
 * Run trigger + claim fidelity across the given harnesses. Positive prompts
 * come from the derived contract; if there are none (no trigger cue in the
 * description) the report is empty.
 */
export async function runBehavioral(
	skill: ParsedSkill,
	contract: SkillContract,
	opts: BehavioralOptions,
): Promise<BehavioralReport> {
	const n = opts.n ?? 20;
	const prompts = contract.positivePrompts;
	const canJudge = judgeAvailable().available;
	const claimRubric = `The response should accomplish this task: ${contract.claim}`;

	const rows: BehavioralRow[] = [];
	for (const harness of opts.harnesses) {
		let fired = 0;
		let claimOk = 0;
		let trials = 0;
		for (const prompt of prompts) {
			for (let t = 0; t < n; t++) {
				trials++;
				const result = await harness.run({
					skillPath: skill.path,
					prompt,
					model: opts.model,
					timeoutMs: opts.timeoutMs,
					installSkillDir: skill.dir,
					readOnly: true,
				});
				if (!skillFired(result, skill)) continue;
				fired++;
				if (canJudge) {
					const verdict = await judge(claimRubric, result.text, {
						model: opts.judgeModel,
					});
					if (verdict.score === 1) claimOk++;
				}
			}
		}
		rows.push({
			harness: harness.id,
			fired,
			claimOk,
			trials,
			claimJudged: canJudge,
		});
	}

	return { rows, n, promptCount: prompts.length };
}

/** Format the behavioral report for the terminal. */
export function formatBehavioral(report: BehavioralReport): string {
	if (!report.promptCount) {
		return [
			"behavioral (trigger + claim fidelity)",
			"  no positive prompts — description has no trigger cue to test.",
		].join("\n");
	}
	const lines = ["behavioral (trigger + claim fidelity)"];
	for (const row of report.rows) {
		const firePct = row.trials
			? Math.round((row.fired / row.trials) * 100)
			: 0;
		lines.push(
			`  ${row.harness.padEnd(9)} trigger ${row.fired}/${row.trials} fired (${firePct}%)`,
		);
		if (row.claimJudged) {
			const claimPct = row.fired
				? Math.round((row.claimOk / row.fired) * 100)
				: 0;
			lines.push(
				`  ${" ".repeat(9)} claim   ${row.claimOk}/${row.fired} fulfil claim (${claimPct}% of fired)`,
			);
		} else {
			lines.push(
				`  ${" ".repeat(9)} claim   not scored — LLM judge unavailable`,
			);
		}
	}
	return lines.join("\n");
}
