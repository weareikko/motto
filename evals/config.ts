/**
 * Eval run configuration: which models to sweep, and env gating.
 *
 * Models are expressed per-harness because each CLI names models differently
 * (Claude Code: `claude-opus-4-8`; Pi: `provider/model`). A model sweep is
 * optional — omit `EVAL_MODELS` to run each harness at its default model.
 */

export interface ModelSpec {
	/** Label used in result rows. */
	label: string;
	/** Per-harness model id override; harnesses absent from the map use their default. */
	perHarness: Record<string, string>;
}

/**
 * Default sweep: same capability tier across providers where possible, so
 * cross-harness comparisons are fair (per the user's "matching capabilities"
 * requirement). Extend as credentials/harnesses become available.
 */
export const DEFAULT_MODELS: ModelSpec[] = [
	{
		label: "default",
		perHarness: {}, // each harness uses its own default model
	},
];

/** Parse `EVAL_MODELS` (comma-separated `harness=model` pairs) into one sweep row, if set. */
export function modelsFromEnv(): ModelSpec[] {
	const raw = (process.env.EVAL_MODELS ?? "").trim();
	if (!raw) return DEFAULT_MODELS;
	const perHarness: Record<string, string> = {};
	for (const pair of raw.split(",")) {
		const [h, m] = pair.split("=").map((s) => s.trim());
		if (h && m) perHarness[h] = m;
	}
	return [{ label: raw, perHarness }];
}

/** Master switch: evals are opt-in and cost real money/tokens. */
export function evalsEnabled(): boolean {
	return process.env.RUN_EVALS === "1";
}
