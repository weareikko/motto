/**
 * OpenCode harness adapter.
 *
 * Headless invocation: `opencode run <prompt>` executes non-interactively; a
 * model can be selected with `--model provider/model`. NOTE: this adapter is
 * written to the documented CLI surface but is UNVERIFIED in this repo — the
 * `opencode` binary was not installed when it was authored, so `detect()`
 * gates it off until a real binary + credentials are present. Confirm the flag
 * names and JSON output shape against the installed version before trusting a
 * green run.
 */

import { dirname } from "node:path";

import type { Harness, HarnessResult, HarnessTask } from "./types";
import { hasAnyEnv, onPath, runBin } from "./exec";

export const opencodeHarness: Harness = {
	id: "opencode",
	displayName: "OpenCode",
	bin: "opencode",

	async detect() {
		if (!(await onPath("opencode")))
			return { available: false, reason: "`opencode` not on PATH" };
		const key = hasAnyEnv(
			"ANTHROPIC_API_KEY",
			"OPENAI_API_KEY",
			"OPENROUTER_API_KEY",
		);
		if (!key)
			return {
				available: false,
				reason: "no provider API key in env for OpenCode",
			};
		return { available: true, reason: "adapter unverified — confirm CLI flags" };
	},

	async run(task: HarnessTask): Promise<HarnessResult> {
		const cwd = task.cwd ?? dirname(task.skillPath);
		const args = ["run", task.prompt];
		if (task.model) args.push("--model", task.model);
		const { stdout } = await runBin("opencode", args, {
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
		// File-read extraction is left generic; refine once the real output
		// shape is confirmed against an installed opencode.
		return { text, filesRead: [], skillsInvoked: [], raw };
	},
};
