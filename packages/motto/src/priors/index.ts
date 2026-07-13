/**
 * Behavioral prior library.
 *
 * A "prior" is a harness-agnostic temperament clause injected into an agent's
 * system prompt before it works a task. Priors let `motto` measure how a
 * skill's own claims hold up under different baseline dispositions (a minimal
 * "baseline" prior vs. a stricter "calibration" or "orchestration" prior)
 * without needing a different harness or model per disposition — the same
 * skill, the same model, just a different injected clause.
 *
 * Text adapted from LatchBio's E1a (calibration) / E1b (orchestration)
 * temperament clauses.
 */

export interface Prior {
	/** Stable id used to select a prior in eval configs and result rows. */
	id: string;
	/** Human-readable summary of what the prior nudges the agent toward. */
	description: string;
	/** Text injected into the system prompt. Empty string for no injection. */
	block: string;
}

export const PRIORS: Prior[] = [
	{
		id: "baseline",
		description: "The model's own instincts — no injected temperament.",
		block: "",
	},
	{
		id: "calibration",
		description:
			"Nudges toward minimal claims and reporting null/borderline results honestly.",
		block:
			"Make minimal claims: only state what the evidence robustly supports. When an effect is small, borderline, or within noise, report that there is no robust difference rather than choosing a direction.",
	},
	{
		id: "orchestration",
		description:
			"Nudges toward planning with a todo list and verifying results before finishing.",
		block:
			"Use a todo list to plan and track your work, and update it frequently. Before finishing, you MUST verify that your result is correct.",
	},
];

/** Look up a prior by id. Returns `undefined` for an unknown id. */
export function getPrior(id: string): Prior | undefined {
	return PRIORS.find((p) => p.id === id);
}
