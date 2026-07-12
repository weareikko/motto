import { describe, it, expect } from "vitest";
import type { AgentEvent } from "@earendil-works/pi-agent-core";

import type { ParsedSkill } from "../src/skill/parse";
import { getPrior } from "../src/priors/index";
import type { AgentFactory, AgentFactoryInit, AgentLike } from "../src/harness/pi-agent";
import { measureTriggerRouter, buildRouterSystemPrompt } from "../src/trigger/router";

const SKILL: ParsedSkill = {
	path: "/skills/gitlab-review/SKILL.md",
	dir: "/skills/gitlab-review",
	raw: "",
	frontmatter: {},
	name: "gitlab-review",
	description: "Review a GitLab merge request for bugs and hygiene issues.",
	body: "",
	references: [],
};

/** Scripted fake factory — no network/API call is ever made in this suite. */
function scriptedAgentFactory(
	events: AgentEvent[],
	onInit?: (init: AgentFactoryInit) => void,
): AgentFactory {
	return (init: AgentFactoryInit): AgentLike => {
		onInit?.(init);
		let listener: ((event: AgentEvent) => void | Promise<void>) | undefined;
		return {
			subscribe(l) {
				listener = l;
				return () => {
					listener = undefined;
				};
			},
			async prompt() {
				for (const event of events) {
					await listener?.(event);
				}
			},
		};
	};
}

function assistantTextMessage(text: string) {
	return { role: "assistant", content: [{ type: "text", text }] };
}

describe("measureTriggerRouter", () => {
	it("fires when the router agent calls use_skill naming this skill", async () => {
		const events: AgentEvent[] = [
			{
				type: "tool_execution_start",
				toolCallId: "1",
				toolName: "use_skill",
				args: { skill: "gitlab-review" },
			},
			{
				type: "agent_end",
				messages: [assistantTextMessage("Engaging gitlab-review.")] as never,
			},
		];

		const result = await measureTriggerRouter({
			skill: SKILL,
			prompt: "Can you review my open MR for issues?",
			priorId: "baseline",
			model: "anthropic/claude-opus-4-8",
			createAgent: scriptedAgentFactory(events),
		});

		expect(result.fired).toBe(true);
		expect(result.toolCalls).toEqual([
			{ name: "use_skill", args: { skill: "gitlab-review" } },
		]);
	});

	it("does not fire when the agent only returns assistant text", async () => {
		const events: AgentEvent[] = [
			{
				type: "agent_end",
				messages: [assistantTextMessage("Sure, the sky is blue.")] as never,
			},
		];

		const result = await measureTriggerRouter({
			skill: SKILL,
			prompt: "Why is the sky blue?",
			priorId: "baseline",
			model: "anthropic/claude-opus-4-8",
			createAgent: scriptedAgentFactory(events),
		});

		expect(result.fired).toBe(false);
		expect(result.text).toBe("Sure, the sky is blue.");
	});

	it("does not fire when use_skill names a different skill", async () => {
		const events: AgentEvent[] = [
			{
				type: "tool_execution_start",
				toolCallId: "1",
				toolName: "use_skill",
				args: { skill: "some-other-skill" },
			},
			{ type: "agent_end", messages: [assistantTextMessage("ok")] as never },
		];

		const result = await measureTriggerRouter({
			skill: SKILL,
			prompt: "irrelevant",
			priorId: "baseline",
			model: "anthropic/claude-opus-4-8",
			createAgent: scriptedAgentFactory(events),
		});

		expect(result.fired).toBe(false);
	});

	it("injects the calibration prior text into the composed systemPrompt", async () => {
		const events: AgentEvent[] = [
			{ type: "agent_end", messages: [assistantTextMessage("ok")] as never },
		];
		let seen: AgentFactoryInit | undefined;

		await measureTriggerRouter({
			skill: SKILL,
			prompt: "review my MR",
			priorId: "calibration",
			model: "anthropic/claude-opus-4-8",
			createAgent: scriptedAgentFactory(events, (init) => {
				seen = init;
			}),
		});

		const calibrationBlock = getPrior("calibration")?.block ?? "";
		expect(calibrationBlock.length).toBeGreaterThan(0);
		expect(seen?.systemPrompt).toContain(calibrationBlock);
		// The skill index is present too, so trigger fidelity has a routing signal.
		expect(seen?.systemPrompt).toContain(SKILL.name);
		expect(seen?.systemPrompt).toContain(SKILL.description);
	});

	it("baseline injects no temperament block into the composed systemPrompt", () => {
		const baselinePrompt = buildRouterSystemPrompt({
			skill: SKILL,
			priorId: "baseline",
		});
		const calibrationBlock = getPrior("calibration")?.block ?? "";
		const orchestrationBlock = getPrior("orchestration")?.block ?? "";

		expect(baselinePrompt).not.toContain(calibrationBlock);
		expect(baselinePrompt).not.toContain(orchestrationBlock);
		// Still carries the router instruction + skill index, just no prior clause.
		expect(baselinePrompt).toContain(SKILL.name);
	});
});
