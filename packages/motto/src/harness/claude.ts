/**
 * Anthropic Claude Code harness adapter.
 *
 * Headless invocation: `claude -p <prompt> --output-format json` prints a
 * single JSON envelope with the final `result` text, usage, and (in
 * stream-json) the tool calls. We use `--output-format json` and additionally
 * extract file reads from the transcript when present.
 */

import { dirname } from "node:path";

import type { Harness, HarnessResult, HarnessTask } from "./types";
import { hasAnyEnv, onPath, runBin } from "./exec";

function extractFileReads(raw: unknown): string[] {
	// Claude's json output nests tool_use blocks; scan defensively for Read
	// tool inputs regardless of exact schema version.
	const files = new Set<string>();
	const walk = (node: unknown): void => {
		if (!node || typeof node !== "object") return;
		const obj = node as Record<string, unknown>;
		if (obj.type === "tool_use" && obj.name === "Read") {
			const input = obj.input as Record<string, unknown> | undefined;
			const p = input?.file_path ?? input?.path;
			if (typeof p === "string") files.add(p);
		}
		for (const v of Object.values(obj)) {
			if (Array.isArray(v)) v.forEach(walk);
			else if (v && typeof v === "object") walk(v);
		}
	};
	walk(raw);
	return [...files];
}

export const claudeHarness: Harness = {
	id: "claude",
	displayName: "Claude Code (Anthropic)",
	bin: "claude",

	async detect() {
		if (!(await onPath("claude")))
			return { available: false, reason: "`claude` not on PATH" };
		// Claude Code can auth via a logged-in session or ANTHROPIC_API_KEY;
		// we can't cheaply verify session auth, so treat presence of the binary
		// as available and let a run surface an auth error if one occurs.
		return { available: true };
	},

	async run(task: HarnessTask): Promise<HarnessResult> {
		const cwd = task.cwd ?? dirname(task.skillPath);
		const args = ["-p", task.prompt, "--output-format", "json"];
		if (task.model) args.push("--model", task.model);
		const { stdout } = await runBin("claude", args, {
			cwd,
			timeoutMs: task.timeoutMs,
		});
		let raw: unknown;
		try {
			raw = JSON.parse(stdout);
		} catch {
			raw = { result: stdout };
		}
		const env = raw as Record<string, unknown>;
		const text =
			typeof env.result === "string"
				? env.result
				: typeof env.text === "string"
					? env.text
					: stdout;
		const usageObj = env.usage as Record<string, number> | undefined;
		return {
			text,
			filesRead: extractFileReads(raw),
			usage: usageObj
				? {
						input: usageObj.input_tokens,
						output: usageObj.output_tokens,
					}
				: undefined,
			raw,
		};
	},
};

/** Exposed for tests: which env var (if any) supplies a Claude API key. */
export const claudeApiKeyEnv = () => hasAnyEnv("ANTHROPIC_API_KEY");
