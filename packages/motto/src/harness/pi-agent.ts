/**
 * Programmatic Pi driver (pi.dev SDK), harness-agnostic.
 *
 * Unlike `./pi.ts` (which shells out to the `pi` CLI as a {@link Harness}),
 * this module drives `@earendil-works/pi-agent-core`'s `Agent` directly
 * against `@earendil-works/pi-ai` models. Two reasons this exists alongside
 * the CLI harness:
 *
 *  - It gives trigger-fidelity measurement (`../trigger/router.ts`) a
 *    *minimal-prior* base: the pi SDK doesn't bake in any of its own
 *    system-prompt temperament the way the `claude` CLI does, so a skill's
 *    trigger behavior can be attributed to the skill + injected prior alone.
 *  - The agent factory is injectable (`createAgent`), so unit tests exercise
 *    a scripted fake and never make a network/API call.
 *
 * SDK facts below were verified against the installed
 * `@earendil-works/{pi-ai,pi-agent-core,pi-coding-agent}@0.80.6` `.d.ts`/`.js`
 * sources (not guessed), cross-checked against
 * `~/github.com/ikko-dev/gitlab-review/src/gitlab-review.ts` which pins
 * 0.75.3. The one thing that changed: 0.75.3's free `getModel(provider, id)`
 * function moved to a method on a `Models` collection — `createModels()` —
 * in 0.80.6.
 */

import type { AgentEvent, AgentTool } from "@earendil-works/pi-agent-core";
import { Agent } from "@earendil-works/pi-agent-core";
import { createModels } from "@earendil-works/pi-ai";
// `getEnvApiKey` lives in `env-api-keys.ts`, which the top-level `"."` entry
// point does NOT re-export (verified against `dist/index.d.ts`) — only the
// `"./compat"` subpath does (`dist/compat.d.ts`: `export * from
// "./env-api-keys.ts"`). `"./compat"` is a real, documented `exports` entry
// (see `package.json`), not a deep-import bypass.
import { getEnvApiKey } from "@earendil-works/pi-ai/compat";
// `providers/all` is a documented subpath export (see package.json `exports`)
// carrying the built-in provider factories that the top-level `createModels()`
// does *not* register on its own (verified in `models.js`/`providers/all.js`:
// bare `createModels()` returns an empty registry — `builtinModels()` /
// `builtinProviders()` are what wire up the real catalog).
import { builtinProviders } from "@earendil-works/pi-ai/providers/all";

/** Split "provider/modelId" on the FIRST "/" — the id itself may contain slashes. */
export function splitModel(spec: string): { provider: string; id: string } {
	const idx = spec.indexOf("/");
	if (idx < 0) return { provider: spec, id: "" };
	return { provider: spec.slice(0, idx), id: spec.slice(idx + 1) };
}

/**
 * The subset of the real pi `Agent` this driver depends on: `subscribe` to
 * observe lifecycle events, `prompt` to start a turn (confirmed as the
 * send/await mechanism in `gitlab-review.ts`'s `runAgentToCompletion`, which
 * calls `agent.prompt(userPrompt)` then races an `agent_end` event against a
 * timeout). Kept minimal so tests can substitute a fake that never touches a
 * network.
 */
export interface AgentLike {
	subscribe(listener: (event: AgentEvent) => void | Promise<void>): () => void;
	prompt(input: string): Promise<void>;
}

export interface AgentFactoryInit {
	/** System prompt for the run (prior block + task-specific instructions already composed in). */
	systemPrompt: string;
	/** "provider/modelId" spec, same notation `runPiAgent` accepts. */
	model: string;
	/** Tools available to the agent for this run. */
	tools?: unknown;
}

/** Builds an {@link AgentLike} for a run. Swappable so tests inject a fake. */
export type AgentFactory = (init: AgentFactoryInit) => AgentLike;

export interface PiRunResult {
	/** Final assistant text. */
	text: string;
	/** Every tool call the agent made, in order. */
	toolCalls: { name: string; args: unknown }[];
	/** Paths read via a Read-like tool (name matching /read/i), de-duplicated. */
	filesRead: string[];
	/** Skill names engaged via a `use_skill` tool call, de-duplicated. */
	skillsInvoked: string[];
}

export interface RunPiAgentOptions {
	/** "provider/modelId", e.g. "anthropic/claude-opus-4-8". */
	model: string;
	systemPrompt: string;
	prompt: string;
	tools?: unknown;
	/** Hard wall-clock cap in ms. Defaults to 120s. */
	timeoutMs?: number;
	/** Inject a fake agent factory for tests; omit to drive the real pi SDK. */
	createAgent?: AgentFactory;
}

const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * A `Models` collection with every built-in provider registered — see the
 * `builtinProviders` import comment above for why this isn't just
 * `createModels()`.
 */
function createModelsWithBuiltins() {
	const models = createModels();
	for (const provider of builtinProviders()) {
		models.setProvider(provider);
	}
	return models;
}

// LIVE PATH UNVALIDATED — no API spend available at build time; verified only
// via injected fake agent. This mirrors gitlab-review's `defaultCreateAgent`
// (0.75.3) adapted for 0.80.6's `createModels().getModel(provider, id)`.
function defaultCreateAgent(init: AgentFactoryInit): AgentLike {
	const { provider, id } = splitModel(init.model);
	const models = createModelsWithBuiltins();
	const model = models.getModel(provider, id);
	if (!model) {
		throw new Error(
			`Unknown pi model "${init.model}" (provider "${provider}", id "${id}")`,
		);
	}
	return new Agent({
		initialState: {
			systemPrompt: init.systemPrompt,
			model,
			tools: init.tools as AgentTool[] | undefined,
		},
		getApiKey: getEnvApiKey,
	}) as unknown as AgentLike;
}

/** Extract the trailing text content of the last non-empty assistant message. */
function extractLastAssistantText(messages: unknown[]): string {
	for (let i = messages.length - 1; i >= 0; i -= 1) {
		const message = messages[i] as
			| { role?: string; content?: unknown }
			| undefined;
		if (message?.role !== "assistant" || !Array.isArray(message.content))
			continue;
		const text = message.content
			.map((part: unknown) => {
				const p = part as { type?: string; text?: string } | undefined;
				return p?.type === "text" && typeof p.text === "string" ? p.text : "";
			})
			.join("")
			.trim();
		if (text) return text;
	}
	return "";
}

/**
 * Drive a pi agent through a single prompt to completion. Collects tool
 * calls, Read-like file paths, and `use_skill` invocations from
 * `tool_execution_start` events, and the final assistant text from
 * `agent_end`.
 */
export async function runPiAgent(
	opts: RunPiAgentOptions,
): Promise<PiRunResult> {
	const createAgent = opts.createAgent ?? defaultCreateAgent;
	const agent = createAgent({
		systemPrompt: opts.systemPrompt,
		model: opts.model,
		tools: opts.tools,
	});

	const toolCalls: { name: string; args: unknown }[] = [];
	const filesReadSet = new Set<string>();
	const skillsInvokedSet = new Set<string>();
	let text = "";

	const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	let unsubscribe: (() => void) | undefined;
	let timeoutId: ReturnType<typeof setTimeout> | undefined;

	try {
		const ended = new Promise<void>((resolvePromise, rejectPromise) => {
			unsubscribe = agent.subscribe((event) => {
				if (event.type === "tool_execution_start") {
					const name = event.toolName;
					const args = event.args as Record<string, unknown> | undefined;
					toolCalls.push({ name, args });
					if (/read/i.test(name)) {
						const p = args?.path ?? args?.file_path ?? args?.file;
						if (typeof p === "string") filesReadSet.add(p);
					}
					if (name === "use_skill") {
						const skill = args?.skill ?? args?.name;
						if (typeof skill === "string") skillsInvokedSet.add(skill);
					}
					return;
				}
				if (event.type !== "agent_end") return;
				text = extractLastAssistantText(event.messages);
				resolvePromise();
			});
		});

		const timeout = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(
				() =>
					reject(
						new Error(
							`Pi agent run timed out after ${Math.round(timeoutMs / 1000)}s`,
						),
					),
				timeoutMs,
			);
		});

		await agent.prompt(opts.prompt);
		await Promise.race([ended, timeout]);
	} finally {
		clearTimeout(timeoutId);
		unsubscribe?.();
	}

	return {
		text,
		toolCalls,
		filesRead: [...filesReadSet],
		skillsInvoked: [...skillsInvokedSet],
	};
}

const CANDIDATE_ENV_KEYS = [
	"ANTHROPIC_API_KEY",
	"OPENAI_API_KEY",
	"GEMINI_API_KEY",
	"CLOUDFLARE_API_KEY",
] as const;

const CANDIDATE_PROVIDERS = [
	"anthropic",
	"openai",
	"google",
	"cloudflare-workers-ai",
] as const;

/** Whether the real pi SDK path can run: any known provider API key in env. */
export async function piDetect(): Promise<{
	available: boolean;
	reason?: string;
}> {
	for (const provider of CANDIDATE_PROVIDERS) {
		if (getEnvApiKey(provider)) return { available: true };
	}
	return {
		available: false,
		reason: `no provider API key in env for Pi (checked ${CANDIDATE_ENV_KEYS.join(", ")})`,
	};
}
