/**
 * OpenAI Codex CLI harness adapter.
 *
 * Headless invocation: `codex exec <prompt>` runs non-interactively (the
 * documented automation entry point); `--model` selects the model. NOTE: like
 * the OpenCode adapter, this is written to the documented CLI surface but is
 * UNVERIFIED here — `codex` was not installed when authored, so `detect()`
 * gates it off. Confirm `exec` flags and output format against the installed
 * version before trusting results.
 */

import { dirname } from "node:path";

import type { Harness, HarnessResult, HarnessTask } from "./types";
import { hasAnyEnv, onPath, runBin } from "./exec";

export const codexHarness: Harness = {
	id: "codex",
	displayName: "Codex CLI (OpenAI)",
	bin: "codex",

	async detect() {
		if (!(await onPath("codex")))
			return { available: false, reason: "`codex` not on PATH" };
		const key = hasAnyEnv("OPENAI_API_KEY");
		if (!key)
			return { available: false, reason: "OPENAI_API_KEY not in env for Codex" };
		return { available: true, reason: "adapter unverified — confirm CLI flags" };
	},

	async run(task: HarnessTask): Promise<HarnessResult> {
		const cwd = task.cwd ?? dirname(task.skillPath);
		// `--skip-git-repo-check` keeps exec usable in scratch dirs; drop if the
		// installed codex rejects it.
		const args = ["exec", task.prompt];
		if (task.model) args.push("--model", task.model);
		const { stdout } = await runBin("codex", args, {
			cwd,
			timeoutMs: task.timeoutMs,
		});
		let raw: unknown;
		try {
			raw = JSON.parse(stdout);
		} catch {
			raw = { text: stdout };
		}
		const obj = raw as Record<string, unknown>;
		const text = typeof obj.text === "string" ? obj.text : stdout;
		return { text, filesRead: [], raw };
	},
};
