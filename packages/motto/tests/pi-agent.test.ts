import { describe, it, expect } from "vitest";
import type { AgentEvent } from "@earendil-works/pi-agent-core";

import {
	splitModel,
	runPiAgent,
	type AgentFactory,
	type AgentFactoryInit,
	type AgentLike,
} from "../src/harness/pi-agent";

/**
 * Build a fake `AgentFactory` that plays back a scripted event sequence to
 * whatever listener `runPiAgent` subscribes, when `.prompt()` is called. No
 * network/API call is ever made — this is the only agent used in this suite.
 */
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

describe("splitModel", () => {
	it("splits provider/id on the first slash", () => {
		expect(splitModel("anthropic/claude-opus-4-8")).toEqual({
			provider: "anthropic",
			id: "claude-opus-4-8",
		});
	});

	it("keeps slashes inside the model id", () => {
		expect(splitModel("openrouter/meta/llama-3.1-70b")).toEqual({
			provider: "openrouter",
			id: "meta/llama-3.1-70b",
		});
	});

	it("handles a bare model with no provider", () => {
		expect(splitModel("gpt-4o")).toEqual({ provider: "gpt-4o", id: "" });
	});
});

describe("runPiAgent", () => {
	it("collects a use_skill tool call into skillsInvoked", async () => {
		const events: AgentEvent[] = [
			{ type: "agent_start" },
			{ type: "turn_start" },
			{
				type: "tool_execution_start",
				toolCallId: "1",
				toolName: "use_skill",
				args: { skill: "gitlab-review" },
			},
			{
				type: "agent_end",
				messages: [assistantTextMessage("Engaged gitlab-review.")] as never,
			},
		];

		const result = await runPiAgent({
			model: "anthropic/claude-opus-4-8",
			systemPrompt: "system",
			prompt: "review this MR",
			createAgent: scriptedAgentFactory(events),
		});

		expect(result.skillsInvoked).toEqual(["gitlab-review"]);
		expect(result.toolCalls).toEqual([
			{ name: "use_skill", args: { skill: "gitlab-review" } },
		]);
		expect(result.text).toBe("Engaged gitlab-review.");
	});

	it("collects Read-like tool calls into filesRead", async () => {
		const events: AgentEvent[] = [
			{
				type: "tool_execution_start",
				toolCallId: "1",
				toolName: "read",
				args: { path: "/proj/SKILL.md" },
			},
			{ type: "agent_end", messages: [assistantTextMessage("Done.")] as never },
		];

		const result = await runPiAgent({
			model: "anthropic/claude-opus-4-8",
			systemPrompt: "system",
			prompt: "read the skill",
			createAgent: scriptedAgentFactory(events),
		});

		expect(result.filesRead).toEqual(["/proj/SKILL.md"]);
		expect(result.skillsInvoked).toEqual([]);
	});

	it("returns fired:false-equivalent (no tool calls) when the agent only answers in text", async () => {
		const events: AgentEvent[] = [
			{
				type: "agent_end",
				messages: [assistantTextMessage("The capital of France is Paris.")] as never,
			},
		];

		const result = await runPiAgent({
			model: "anthropic/claude-opus-4-8",
			systemPrompt: "system",
			prompt: "what is the capital of France?",
			createAgent: scriptedAgentFactory(events),
		});

		expect(result.toolCalls).toEqual([]);
		expect(result.skillsInvoked).toEqual([]);
		expect(result.filesRead).toEqual([]);
		expect(result.text).toBe("The capital of France is Paris.");
	});

	it("passes the composed systemPrompt and model spec through to the agent factory", async () => {
		const events: AgentEvent[] = [
			{ type: "agent_end", messages: [assistantTextMessage("ok")] as never },
		];
		let seen: AgentFactoryInit | undefined;

		await runPiAgent({
			model: "anthropic/claude-opus-4-8",
			systemPrompt: "be terse",
			prompt: "hi",
			createAgent: scriptedAgentFactory(events, (init) => {
				seen = init;
			}),
		});

		expect(seen?.systemPrompt).toBe("be terse");
		expect(seen?.model).toBe("anthropic/claude-opus-4-8");
	});
});
