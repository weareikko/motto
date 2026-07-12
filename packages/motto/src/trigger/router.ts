/**
 * Router-mode trigger fidelity: model-portable measurement of "did the skill
 * fire?".
 *
 * Real agent harnesses (Claude Code, OpenCode, …) each bake in their own
 * system-prompt temperament, so a skill firing (or not) under `claude` can't
 * be cleanly attributed to the skill's own description — some of the effect
 * is the harness's priors. This module drives a pi agent on a
 * *minimal-prior* base (see `../priors`) with exactly one tool available
 * (`use_skill`) and a one-entry skill index (the skill's own name +
 * description). Whether the model calls `use_skill` for that skill, given
 * only its own description as the routing signal, is the trigger-fidelity
 * measurement — portable across any model `runPiAgent` can drive.
 */

import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai";

import type { ParsedSkill } from "../skill/parse";
import { getPrior } from "../priors/index";
import type { AgentFactory } from "../harness/pi-agent";
import { runPiAgent } from "../harness/pi-agent";

const ROUTER_INSTRUCTION =
	"You are a routing agent. You are given a user request and an index of one skill (its name and description). " +
	'If the skill\'s description matches what the user is asking for, call the "use_skill" tool naming it. ' +
	"If it does not match, answer normally and do not call use_skill.";

/** The no-op tool offered to the router agent: it only records that it was called. */
export function buildUseSkillTool(): AgentTool {
	return {
		name: "use_skill",
		label: "Use skill",
		description:
			"Engage a skill by name when its description matches the user's request.",
		parameters: Type.Object({
			skill: Type.String({ description: "Name of the skill to engage." }),
		}),
		async execute(_toolCallId, params) {
			const p = params as { skill?: string };
			return {
				content: [
					{ type: "text", text: `Engaged skill "${p.skill ?? ""}".` },
				],
				details: params,
			};
		},
	};
}

export interface BuildRouterSystemPromptArgs {
	skill: ParsedSkill;
	priorId: string;
}

/** Compose the router instruction + injected prior block + one-entry skill index. */
export function buildRouterSystemPrompt(
	args: BuildRouterSystemPromptArgs,
): string {
	const priorBlock = getPrior(args.priorId)?.block ?? "";
	const skillIndex = `## Available skills\n\n- ${args.skill.name}: ${args.skill.description}`;
	return [ROUTER_INSTRUCTION, priorBlock, skillIndex]
		.filter((section) => section.length > 0)
		.join("\n\n");
}

export interface MeasureTriggerRouterArgs {
	skill: ParsedSkill;
	prompt: string;
	priorId: string;
	model: string;
	/** Inject a fake agent factory for tests; omit to drive the real pi SDK. */
	createAgent?: AgentFactory;
}

export interface TriggerRouterResult {
	/** True when the router agent invoked `use_skill` naming this skill. */
	fired: boolean;
	toolCalls: { name: string; args: unknown }[];
	text: string;
}

/** Run the router agent once and report whether the skill fired. */
export async function measureTriggerRouter(
	args: MeasureTriggerRouterArgs,
): Promise<TriggerRouterResult> {
	const systemPrompt = buildRouterSystemPrompt({
		skill: args.skill,
		priorId: args.priorId,
	});
	const result = await runPiAgent({
		model: args.model,
		systemPrompt,
		prompt: args.prompt,
		tools: [buildUseSkillTool()],
		createAgent: args.createAgent,
	});
	return {
		fired: result.skillsInvoked.includes(args.skill.name),
		toolCalls: result.toolCalls,
		text: result.text,
	};
}
