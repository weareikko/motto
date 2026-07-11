/**
 * Pi coding agent harness adapter (pi.dev).
 *
 * Headless invocation: `pi -p <prompt> --mode json` runs non-interactively and
 * emits JSON. Model/provider are selectable with `--model` / `--provider`; Pi
 * defaults to the `google` provider, so a run needs a provider credential in
 * env for whichever provider is selected.
 */

import { dirname } from "node:path";

import type { Harness, HarnessResult, HarnessTask } from "./types";
import { hasAnyEnv, onPath, runBin } from "./exec";

function extractFileReads(raw: unknown): string[] {
	const files = new Set<string>();
	const walk = (node: unknown): void => {
		if (!node || typeof node !== "object") return;
		const obj = node as Record<string, unknown>;
		// Pi tool calls surface as read/Read tool invocations with a path arg.
		const name = typeof obj.tool === "string" ? obj.tool : obj.name;
		if (typeof name === "string" && /read/i.test(name)) {
			const input = (obj.input ?? obj.args ?? obj.parameters) as
				| Record<string, unknown>
				| undefined;
			const p = input?.path ?? input?.file_path ?? input?.file;
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

export const piHarness: Harness = {
	id: "pi",
	displayName: "Pi coding agent",
	bin: "pi",

	async detect() {
		if (!(await onPath("pi")))
			return { available: false, reason: "`pi` not on PATH" };
		// Pi resolves API keys from env per provider. Without any known key set
		// a run will fail; flag that as the skip reason rather than the binary.
		const key = hasAnyEnv(
			"GOOGLE_API_KEY",
			"GEMINI_API_KEY",
			"ANTHROPIC_API_KEY",
			"OPENAI_API_KEY",
			"CLOUDFLARE_API_KEY",
		);
		if (!key)
			return {
				available: false,
				reason: "no provider API key in env for Pi (GOOGLE/ANTHROPIC/OPENAI/…)",
			};
		return { available: true };
	},

	async run(task: HarnessTask): Promise<HarnessResult> {
		const cwd = task.cwd ?? dirname(task.skillPath);
		const args = ["-p", task.prompt, "--mode", "json", "--no-session"];
		if (task.model) args.push("--model", task.model);
		const { stdout } = await runBin("pi", args, {
			cwd,
			timeoutMs: task.timeoutMs,
		});
		let raw: unknown;
		try {
			raw = JSON.parse(stdout);
		} catch {
			// Pi json mode may emit JSONL; take the last parseable line.
			const lines = stdout.trim().split("\n").filter(Boolean);
			for (let i = lines.length - 1; i >= 0; i--) {
				try {
					raw = JSON.parse(lines[i]);
					break;
				} catch {
					/* keep scanning */
				}
			}
			raw ??= { text: stdout };
		}
		const obj = raw as Record<string, unknown>;
		const text =
			typeof obj.text === "string"
				? obj.text
				: typeof obj.result === "string"
					? obj.result
					: typeof obj.content === "string"
						? obj.content
						: stdout;
		return { text, filesRead: extractFileReads(raw), skillsInvoked: [], raw };
	},
};
