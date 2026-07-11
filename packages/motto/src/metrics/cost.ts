/**
 * Token-cost metric for a skill — the one metric that needs no credentials and
 * no agent runs, so it ships first and works everywhere.
 *
 * The cost of a skill is not one number; it is paid in three tiers with very
 * different frequencies:
 *
 *   1. index  — `name: description`. Loaded into the system prompt for EVERY
 *               request in a session, whether or not the skill is used. This is
 *               the recurring tax; a bloated description is the most expensive
 *               kind of bloat.
 *   2. body   — the SKILL.md body. Loaded once, only when the skill triggers.
 *   3. refs   — each linked reference file. Loaded on demand, only if the agent
 *               opens it (progressive disclosure). `worstCase` assumes all are
 *               read; a live run reports which actually were.
 *
 * Measured with `@anthropic-ai/tokenizer` (Claude's tokenizer), so the numbers
 * reflect real context spend on Claude models.
 */

import { readFileSync } from "node:fs";
import { countTokens } from "@anthropic-ai/tokenizer";
import type { ParsedSkill } from "../skill/parse";

export interface ReferenceCost {
	relPath: string;
	tokens: number;
	exists: boolean;
}

export interface CostReport {
	/** `name: description` — always-loaded per-request tax. */
	indexTokens: number;
	/** SKILL.md body (frontmatter stripped) — loaded on trigger. */
	bodyTokens: number;
	/** Whole SKILL.md file including frontmatter. */
	skillMdTokens: number;
	/** Per-reference on-demand cost. */
	references: ReferenceCost[];
	/** Sum of all reference files (all read). */
	onDemandTotalTokens: number;
	/** skillMd + every reference — the ceiling if the agent reads everything. */
	worstCaseTokens: number;
}

/** Measure a skill's token cost across the three tiers. */
export function measureCost(skill: ParsedSkill): CostReport {
	const indexEntry = skill.name
		? `${skill.name}: ${skill.description}`
		: skill.description;
	const indexTokens = indexEntry ? countTokens(indexEntry) : 0;
	const bodyTokens = skill.body.trim() ? countTokens(skill.body) : 0;
	const skillMdTokens = countTokens(skill.raw);

	const references: ReferenceCost[] = skill.references.map((ref) => {
		if (!ref.exists) return { relPath: ref.relPath, tokens: 0, exists: false };
		let tokens = 0;
		try {
			tokens = countTokens(readFileSync(ref.absPath, "utf8"));
		} catch {
			tokens = 0;
		}
		return { relPath: ref.relPath, tokens, exists: true };
	});

	const onDemandTotalTokens = references.reduce((sum, r) => sum + r.tokens, 0);
	return {
		indexTokens,
		bodyTokens,
		skillMdTokens,
		references,
		onDemandTotalTokens,
		worstCaseTokens: skillMdTokens + onDemandTotalTokens,
	};
}
