import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AgentEvent } from "@earendil-works/pi-agent-core";

import type {
	AgentFactory,
	AgentFactoryInit,
	AgentLike,
} from "../src/harness/pi-agent";
import { runBench, formatBenchReport } from "../src/bench/index";

/**
 * Scripted fake factory — no network/API call is ever made in this suite.
 * `fires` controls whether the router agent calls `use_skill` naming the
 * skill the composed system prompt indexes (read back out of `init` so the
 * same factory works for any skill under test).
 */
function scriptedAgentFactory(fires: boolean): AgentFactory {
	return (init: AgentFactoryInit): AgentLike => {
		let listener: ((event: AgentEvent) => void | Promise<void>) | undefined;
		return {
			subscribe(l) {
				listener = l;
				return () => {
					listener = undefined;
				};
			},
			async prompt() {
				const events: AgentEvent[] = fires
					? [
							{
								type: "tool_execution_start",
								toolCallId: "1",
								toolName: "use_skill",
								args: { skill: skillNameFromSystemPrompt(init.systemPrompt) },
							},
							{
								type: "agent_end",
								messages: [
									{
										role: "assistant",
										content: [{ type: "text", text: "engaged" }],
									},
								] as never,
							},
						]
					: [
							{
								type: "agent_end",
								messages: [
									{
										role: "assistant",
										content: [{ type: "text", text: "not engaged" }],
									},
								] as never,
							},
						];
				for (const event of events) {
					await listener?.(event);
				}
			},
		};
	};
}

/** The router system prompt's skill index line is `- <name>: <description>`. */
function skillNameFromSystemPrompt(systemPrompt: string): string {
	const match = systemPrompt.match(/^- (\S+):/m);
	return match?.[1] ?? "";
}

// Fixture skill directories, written once for the whole suite.
let dir: string;
let alphaPath: string; // one positive prompt (no "use when" cue)
let multiPath: string; // three positive prompts (for the maxPromptsPerSkill cap test)
let emptyPath: string; // empty description -> zero positive prompts -> must be skipped

beforeAll(() => {
	dir = mkdtempSync(join(tmpdir(), "motto-bench-test-"));

	// SKILL.md fixtures need their own directories (parseSkill resolves
	// `<dir>/SKILL.md`).
	const mkSkill = (name: string, description: string): string => {
		const skillDir = join(dir, name);
		mkdirSync(skillDir, { recursive: true });
		writeFileSync(
			join(skillDir, "SKILL.md"),
			`---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\nBody.\n`,
		);
		return skillDir;
	};

	alphaPath = mkSkill("alpha-skill", "Handles alpha widget tasks.");
	multiPath = mkSkill(
		"multi-skill",
		"Handles multi-domain tasks. Use when the user asks to foo, bar, or baz.",
	);
	emptyPath = mkSkill("empty-skill", "");
});

afterAll(() => {
	rmSync(dir, { recursive: true, force: true });
});

describe("runBench", () => {
	it("a skill that always fires lands in the 'always' band (large n clears the 0.95 Wilson lower bound)", async () => {
		const report = await runBench({
			skillPaths: [alphaPath],
			models: ["anthropic/claude-opus-4-8"],
			priorIds: ["baseline"],
			n: 100, // 1 positive prompt * n=100 trials; known to clear 0.95 lower bound (see stats.test.ts)
			createAgent: scriptedAgentFactory(true),
		});

		expect(report.cells).toHaveLength(1);
		const cell = report.cells[0];
		expect(cell.skill).toBe("alpha-skill");
		expect(cell.trials).toBe(100);
		expect(cell.fired).toBe(100);
		expect(cell.band).toBe("always");
	});

	it("a skill that never fires lands in the 'rarely' band", async () => {
		const report = await runBench({
			skillPaths: [alphaPath],
			models: ["anthropic/claude-opus-4-8"],
			priorIds: ["baseline"],
			n: 20, // 0/20 is known to sit comfortably inside "rarely" (see stats.test.ts)
			createAgent: scriptedAgentFactory(false),
		});

		expect(report.cells).toHaveLength(1);
		const cell = report.cells[0];
		expect(cell.fired).toBe(0);
		expect(cell.trials).toBe(20);
		expect(cell.band).toBe("rarely");
	});

	it("sweeps every (skill × model × prior) cell, skipping skills with no positive prompts", async () => {
		const report = await runBench({
			skillPaths: [alphaPath, multiPath, emptyPath],
			models: ["anthropic/claude-opus-4-8", "cloudflare-ai-gateway/claude-haiku-4-5"],
			priorIds: ["baseline", "calibration", "orchestration"],
			n: 1,
			createAgent: scriptedAgentFactory(true),
		});

		// 2 skills with prompts (alpha, multi) x 2 models x 3 priors = 12 cells;
		// empty-skill is skipped entirely (no positive prompts).
		expect(report.cells).toHaveLength(12);
		expect(report.config.skills.toSorted()).toEqual(["alpha-skill", "multi-skill"]);
		expect(report.cells.some((c) => c.skill === "empty-skill")).toBe(false);
	});

	it("caps positive prompts per skill at maxPromptsPerSkill", async () => {
		const n = 4;
		const report = await runBench({
			skillPaths: [multiPath],
			models: ["anthropic/claude-opus-4-8"],
			priorIds: ["baseline"],
			n,
			maxPromptsPerSkill: 2,
			createAgent: scriptedAgentFactory(true),
		});

		expect(report.cells).toHaveLength(1);
		// multi-skill's "Use when ... foo, bar, or baz" derives 3 triggers;
		// capped at 2 prompts, so trials = 2 * n.
		expect(report.cells[0].trials).toBe(2 * n);
	});

	it("defaults maxPromptsPerSkill to 2 when omitted", async () => {
		const n = 3;
		const report = await runBench({
			skillPaths: [multiPath],
			models: ["anthropic/claude-opus-4-8"],
			priorIds: ["baseline"],
			n,
			createAgent: scriptedAgentFactory(true),
		});

		expect(report.cells[0].trials).toBe(2 * n);
	});

	it("accounts totalCalls as exactly the sum of every cell's trials", async () => {
		const report = await runBench({
			skillPaths: [alphaPath, multiPath],
			models: ["anthropic/claude-opus-4-8", "cloudflare-ai-gateway/claude-haiku-4-5"],
			priorIds: ["baseline", "calibration"],
			n: 2,
			createAgent: scriptedAgentFactory(true),
		});

		const summedTrials = report.cells.reduce((sum, c) => sum + c.trials, 0);
		expect(report.totalCalls).toBe(summedTrials);
		// alpha-skill: 1 prompt, multi-skill: capped to 2 prompts -> (1+2) * 2 models * 2 priors * n=2
		expect(report.totalCalls).toBe((1 + 2) * 2 * 2 * 2);
	});

	it("does not crash and returns an empty report when no skill has positive prompts", async () => {
		const report = await runBench({
			skillPaths: [emptyPath],
			models: ["anthropic/claude-opus-4-8"],
			priorIds: ["baseline"],
			n: 1,
			createAgent: scriptedAgentFactory(true),
		});

		expect(report.cells).toEqual([]);
		expect(report.config.skills).toEqual([]);
		expect(report.totalCalls).toBe(0);
	});
});

describe("formatBenchReport", () => {
	it("includes the header (n, totalCalls) and a row per cell grouped by skill", async () => {
		const report = await runBench({
			skillPaths: [alphaPath],
			models: ["anthropic/claude-opus-4-8"],
			priorIds: ["baseline"],
			n: 5,
			createAgent: scriptedAgentFactory(true),
		});

		const text = formatBenchReport(report);
		expect(text).toContain("n=5");
		expect(text).toContain(`totalCalls=${report.totalCalls}`);
		expect(text).toContain("alpha-skill");
		expect(text).toContain("anthropic/claude-opus-4-8");
		expect(text).toContain("baseline");
		expect(text).toContain(`${report.cells[0].fired}/${report.cells[0].trials}`);
	});

	it("reports 'no cells' cleanly when the sweep produced none", () => {
		const text = formatBenchReport({
			cells: [],
			config: { models: [], priorIds: [], n: 5, skills: [] },
			totalCalls: 0,
		});
		expect(text).toContain("no cells");
	});
});
