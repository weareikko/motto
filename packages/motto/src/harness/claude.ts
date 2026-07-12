/**
 * Anthropic Claude Code harness adapter.
 *
 * Two run modes:
 *
 *  - Plain (`installSkillDir` unset): `claude -p <prompt> --output-format json`
 *    — one JSON envelope with the final `result` text and usage.
 *
 *  - Skill-eval (`installSkillDir` set): the skill is staged into an isolated
 *    temp project at `<tmp>/.claude/skills/<name>/` so the agent can actually
 *    discover and trigger it, and we run with `--output-format stream-json` to
 *    see the tool calls. A skill firing shows up as a `Skill` tool_use
 *    (`{"skill":"<name>", …}`) — that, not a Read of SKILL.md, is the
 *    trigger-fidelity signal (verified against Claude Code 2.1 output).
 */

import { basename, dirname, join } from "node:path";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

import type { Harness, HarnessResult, HarnessTask } from "./types";
import { hasAnyEnv, onPath, runBin } from "./exec";

export interface Extracted {
	filesRead: string[];
	skillsInvoked: string[];
}

/** Walk any nested JSON, collecting Read file paths and Skill invocations. */
export function extractToolSignals(node: unknown, out: Extracted): void {
	if (!node || typeof node !== "object") return;
	const obj = node as Record<string, unknown>;
	if (obj.type === "tool_use") {
		const input = obj.input as Record<string, unknown> | undefined;
		if (obj.name === "Read") {
			const p = input?.file_path ?? input?.path;
			if (typeof p === "string") out.filesRead.push(p);
		} else if (obj.name === "Skill") {
			const s = input?.skill ?? input?.name ?? input?.command;
			if (typeof s === "string") out.skillsInvoked.push(s);
		}
	}
	for (const v of Object.values(obj)) {
		if (Array.isArray(v)) v.forEach((c) => extractToolSignals(c, out));
		else if (v && typeof v === "object") extractToolSignals(v, out);
	}
}

/** Parse a stream-json (JSONL) transcript into events, tolerating blank lines. */
export function parseStreamJson(stdout: string): Record<string, unknown>[] {
	const events: Record<string, unknown>[] = [];
	for (const line of stdout.split("\n")) {
		const t = line.trim();
		if (!t) continue;
		try {
			events.push(JSON.parse(t) as Record<string, unknown>);
		} catch {
			// ignore non-JSON noise
		}
	}
	return events;
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
		const install = task.installSkillDir;
		let cwd = task.cwd ?? dirname(task.skillPath);
		let tempProject: string | undefined;

		if (install) {
			const name = basename(install);
			tempProject = mkdtempSync(join(tmpdir(), "motto-skill-"));
			cpSync(install, join(tempProject, ".claude", "skills", name), {
				recursive: true,
			});
			cwd = tempProject;
		}

		try {
			const streaming = Boolean(install);
			const args = ["-p", task.prompt];
			if (streaming) args.push("--output-format", "stream-json", "--verbose");
			else args.push("--output-format", "json");
			if (task.model) args.push("--model", task.model);
			if (task.readOnly)
				args.push("--disallowedTools", "Bash", "Write", "Edit", "WebFetch");

			const { stdout } = await runBin("claude", args, {
				cwd,
				timeoutMs: task.timeoutMs,
			});

			const signals: Extracted = { filesRead: [], skillsInvoked: [] };
			let text = stdout;
			let usageObj: Record<string, number> | undefined;

			if (streaming) {
				const events = parseStreamJson(stdout);
				extractToolSignals(events, signals);
				const resultEvent = [...events]
					.reverse()
					.find((e) => e.type === "result");
				if (resultEvent && typeof resultEvent.result === "string")
					text = resultEvent.result;
				usageObj = resultEvent?.usage as Record<string, number> | undefined;
			} else {
				let raw: unknown;
				try {
					raw = JSON.parse(stdout);
				} catch {
					raw = { result: stdout };
				}
				extractToolSignals(raw, signals);
				const env = raw as Record<string, unknown>;
				text =
					typeof env.result === "string"
						? env.result
						: typeof env.text === "string"
							? env.text
							: stdout;
				usageObj = env.usage as Record<string, number> | undefined;
			}

			return {
				text,
				filesRead: [...new Set(signals.filesRead)],
				skillsInvoked: [...new Set(signals.skillsInvoked)],
				usage: usageObj
					? { input: usageObj.input_tokens, output: usageObj.output_tokens }
					: undefined,
				raw: stdout,
			};
		} finally {
			if (tempProject) rmSync(tempProject, { recursive: true, force: true });
		}
	},
};

/** Exposed for tests: which env var (if any) supplies a Claude API key. */
export const claudeApiKeyEnv = () => hasAnyEnv("ANTHROPIC_API_KEY");
