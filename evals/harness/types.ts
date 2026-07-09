/**
 * Harness abstraction for skill research evals.
 *
 * A "harness" is an agent CLI that can be pointed at a skill directory and a
 * task, run headlessly, and produce (a) its final text answer and (b) which
 * files it read while working. This lets the same benchmark run across
 * Anthropic's Claude Code, Pi, OpenCode, and Codex — so a finding can be
 * checked for robustness across agent implementations, not just models.
 *
 * Adapters shell out to the real CLI in non-interactive mode. They are gated
 * by `detect()` (is the binary installed?) so an eval degrades gracefully to
 * "skipped" rather than failing when a harness or its credentials are absent.
 */

export interface HarnessTask {
	/** Absolute path to the skill's SKILL.md (or its directory). */
	skillPath: string;
	/** The instruction to give the agent. */
	prompt: string;
	/** Model id to request, in the harness's own notation. Optional. */
	model?: string;
	/** Working directory for the run (defaults to the skill's dir). */
	cwd?: string;
	/** Hard wall-clock cap in ms. */
	timeoutMs?: number;
}

export interface HarnessResult {
	/** The agent's final text answer. */
	text: string;
	/** Relative/absolute paths the agent read via its file tools, if the
	 *  harness exposes tool calls in its output. Empty if not extractable. */
	filesRead: string[];
	/** Token usage if the harness reports it. */
	usage?: { input?: number; output?: number; total?: number };
	/** Raw parsed harness output, for debugging / richer assertions. */
	raw: unknown;
}

export interface Harness {
	/** Stable id used in eval matrices and result labels. */
	id: string;
	/** Human-readable name. */
	displayName: string;
	/** The CLI binary this harness invokes. */
	bin: string;
	/**
	 * Whether this harness can run right now: binary on PATH AND any required
	 * credential present. Evals call this to skip cleanly.
	 */
	detect(): Promise<{ available: boolean; reason?: string }>;
	/** Run one task headlessly. */
	run(task: HarnessTask): Promise<HarnessResult>;
}
