/**
 * Trigger-fidelity SWEEP bench.
 *
 * `measureTriggerRouter` (`../trigger/router`) answers "did the skill fire?"
 * for one (skill, prompt, model, prior) combination. This module sweeps that
 * probe across every (skill × model × prior) cell a caller asks for, deriving
 * the skill's own positive prompts from its description contract (no
 * author-written eval cases needed), and aggregates each cell's fire rate into
 * a reliability band via `../stats`.
 *
 * This is the SERIAL, simple version — a live run is rate-limited by the
 * provider, and correctness (one skill's numbers not bleeding into another's)
 * matters far more than wall-clock speed here. Every trial is one
 * `measureTriggerRouter` call, so `totalCalls` is exactly the number of
 * network calls a live run would make — the cost-transparency figure a
 * human decides whether to spend before invoking `motto bench` for real.
 */

import { parseSkill } from "../skill/parse";
import { deriveContract } from "../skill/contract";
import { measureTriggerRouter } from "../trigger/router";
import { band } from "../stats/index";
import type { AgentFactory } from "../harness/pi-agent";

export interface BenchConfig {
	/** Paths to skill directories or SKILL.md files to sweep. */
	skillPaths: string[];
	/** "provider/modelId" specs to sweep. */
	models: string[];
	/** Prior ids (see `../priors`) to sweep. */
	priorIds: string[];
	/** Trials per (skill × model × prior × prompt) cell. */
	n: number;
	/** Cap on positive prompts used per skill. Default 2. */
	maxPromptsPerSkill?: number;
	/** Inject a fake agent factory for tests; omit to drive the real pi SDK. */
	createAgent?: AgentFactory;
}

export interface BenchCell {
	/** Skill name (frontmatter `name`, not the file path). */
	skill: string;
	model: string;
	prior: string;
	/** Trials where the router agent fired `use_skill` for this skill. */
	fired: number;
	/** Total trials attempted for this cell (positivePrompts-for-skill × n). */
	trials: number;
	/** Trials that threw (auth/rate-limit/etc.) and were excluded from the band. */
	errored: number;
	/** First error message seen in this cell, if any (for diagnosis). */
	errorSample?: string;
	band: string;
	lo: number;
	hi: number;
}

export interface BenchReport {
	cells: BenchCell[];
	config: {
		models: string[];
		priorIds: string[];
		n: number;
		/** Skill names actually swept (skills with zero positive prompts are omitted). */
		skills: string[];
	};
	/** Total `measureTriggerRouter` invocations across the whole sweep. */
	totalCalls: number;
}

const DEFAULT_MAX_PROMPTS_PER_SKILL = 2;

/**
 * Run the full (skill × model × prior) sweep. Skills whose description
 * yields no positive prompts (no "use when …" cue and an empty claim) are
 * skipped — nothing to test, and skipping keeps a heterogeneous batch of
 * skill paths from crashing the whole sweep.
 */
export async function runBench(config: BenchConfig): Promise<BenchReport> {
	const maxPrompts = config.maxPromptsPerSkill ?? DEFAULT_MAX_PROMPTS_PER_SKILL;
	const cells: BenchCell[] = [];
	const skillNames: string[] = [];
	let totalCalls = 0;

	for (const skillPath of config.skillPaths) {
		const skill = parseSkill(skillPath);
		const contract = deriveContract(skill.description);
		const prompts = contract.positivePrompts.slice(0, maxPrompts);
		if (prompts.length === 0) continue; // nothing to test — skip, don't crash
		skillNames.push(skill.name);

		for (const model of config.models) {
			for (const priorId of config.priorIds) {
				let fired = 0;
				let trials = 0;
				let errored = 0;
				let errorSample: string | undefined;
				for (const prompt of prompts) {
					for (let t = 0; t < config.n; t++) {
						trials++;
						totalCalls++;
						// A single failing trial (auth, rate-limit, provider blip)
						// must not abort the whole sweep — record it and carry on,
						// so a long run's other cells still yield numbers.
						try {
							const result = await measureTriggerRouter({
								skill,
								prompt,
								priorId,
								model,
								createAgent: config.createAgent,
							});
							if (result.fired) fired++;
						} catch (err) {
							errored++;
							errorSample ??=
								err instanceof Error ? err.message : String(err);
						}
					}
				}
				// Band over SUCCESSFUL trials only — errored trials are neither
				// fire nor no-fire, so excluding them keeps the rate honest.
				const scored = trials - errored;
				const b = band(fired, scored);
				cells.push({
					skill: skill.name,
					model,
					prior: priorId,
					fired,
					trials,
					errored,
					errorSample,
					band: scored === 0 ? "uncertain" : b.band,
					lo: b.lo,
					hi: b.hi,
				});
			}
		}
	}

	return {
		cells,
		config: {
			models: config.models,
			priorIds: config.priorIds,
			n: config.n,
			skills: skillNames,
		},
		totalCalls,
	};
}

/** Format a bench report as a readable text table, grouped by skill. */
export function formatBenchReport(report: BenchReport): string {
	const lines: string[] = [
		`bench sweep — n=${report.config.n} trial(s)/prompt, totalCalls=${report.totalCalls}`,
	];

	if (!report.cells.length) {
		lines.push("  no cells — no skill produced positive prompts to sweep.");
		return lines.join("\n");
	}

	const bySkill = new Map<string, BenchCell[]>();
	for (const cell of report.cells) {
		const list = bySkill.get(cell.skill);
		if (list) list.push(cell);
		else bySkill.set(cell.skill, [cell]);
	}

	for (const [skill, cells] of bySkill) {
		lines.push("", skill);
		for (const cell of cells) {
			const scored = cell.trials - cell.errored;
			const errFlag = cell.errored
				? `  ⚠ ${cell.errored} errored${cell.errorSample ? ` (${cell.errorSample.slice(0, 60)})` : ""}`
				: "";
			lines.push(
				`  ${cell.model.padEnd(28)} ${cell.prior.padEnd(13)} ${String(cell.fired).padStart(3)}/${String(scored).padEnd(3)} ${cell.band}${errFlag}`,
			);
		}
	}

	return lines.join("\n");
}
