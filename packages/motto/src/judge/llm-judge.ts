/**
 * LLM judge for evals, routed through Cloudflare AI Gateway.
 *
 * Uses the same three-var convention as the other @weareikko projects
 * (gitlab-review, c24n): `CLOUDFLARE_API_KEY` + `CLOUDFLARE_ACCOUNT_ID` +
 * `CLOUDFLARE_GATEWAY_ID`. Dependency-free — a direct call to the gateway's
 * OpenAI-compatible endpoint, so evals don't pull a provider SDK. The judge
 * model is configurable so a benchmark can be scored by a *different* model
 * than the one under test (avoiding self-preference), per the project's
 * "different models and judges" requirement.
 *
 * Model ids use the gateway's `provider/model` form, e.g. `openai/gpt-5.4-mini`
 * or `anthropic/claude-haiku-4-5`.
 *
 * NOTE: the exact gateway auth header is documented but UNVERIFIED here (evals
 * aren't run end-to-end in this environment — no keys, and the org spend limit
 * is a factor). If a live run 401s, check whether your gateway expects the
 * Cloudflare token in `cf-aig-authorization` instead of / in addition to
 * `Authorization`; both are set below to cover the common cases.
 */

const DEFAULT_JUDGE_MODEL = "openai/gpt-5.4-mini";

export interface JudgeVerdict {
	score: 0 | 1;
	rationale: string;
}

function accountId(): string {
	return (process.env.CLOUDFLARE_ACCOUNT_ID ?? "").trim();
}
function gatewayId(): string {
	return (process.env.CLOUDFLARE_GATEWAY_ID ?? "").trim();
}
function apiKey(): string {
	return (process.env.CLOUDFLARE_API_KEY ?? "").trim();
}

export function judgeAvailable(): { available: boolean; reason?: string } {
	if (!apiKey()) return { available: false, reason: "CLOUDFLARE_API_KEY unset" };
	if (!accountId())
		return { available: false, reason: "CLOUDFLARE_ACCOUNT_ID unset" };
	if (!gatewayId())
		return { available: false, reason: "CLOUDFLARE_GATEWAY_ID unset" };
	return { available: true };
}

/** OpenAI-compatible chat/completions URL for the configured gateway. */
function compatUrl(): string {
	return `https://gateway.ai.cloudflare.com/v1/${accountId()}/${gatewayId()}/compat/chat/completions`;
}

/**
 * Ask the judge model a yes/no rubric question about a candidate answer.
 * Returns 1 if the rubric is satisfied, 0 otherwise.
 */
export async function judge(
	rubric: string,
	candidate: string,
	opts: { model?: string; timeoutMs?: number } = {},
): Promise<JudgeVerdict> {
	const token = apiKey();
	const model = opts.model ?? process.env.EVAL_JUDGE_MODEL ?? DEFAULT_JUDGE_MODEL;

	const system =
		"You are a strict evaluation judge. Given a RUBRIC and a CANDIDATE answer, " +
		'decide if the candidate satisfies the rubric. Respond with a JSON object ' +
		'{"score": 0 or 1, "rationale": "<one sentence>"} and nothing else. ' +
		"Score 1 only if the rubric is clearly satisfied; default to 0 when unsure.";
	const user = `RUBRIC:\n${rubric}\n\nCANDIDATE:\n${candidate}`;

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000);
	try {
		const res = await fetch(compatUrl(), {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: `Bearer ${token}`,
				"cf-aig-authorization": `Bearer ${token}`,
			},
			body: JSON.stringify({
				model,
				messages: [
					{ role: "system", content: system },
					{ role: "user", content: user },
				],
				temperature: 0,
				max_tokens: 256,
			}),
			signal: controller.signal,
		});
		if (!res.ok) {
			throw new Error(`judge HTTP ${res.status}: ${await res.text()}`);
		}
		const data = (await res.json()) as {
			choices?: { message?: { content?: string } }[];
		};
		const content = data.choices?.[0]?.message?.content ?? "";
		const match = content.match(/\{[\s\S]*\}/);
		if (!match)
			return { score: 0, rationale: `unparseable judge reply: ${content.slice(0, 120)}` };
		const parsed = JSON.parse(match[0]) as JudgeVerdict;
		return { score: parsed.score === 1 ? 1 : 0, rationale: parsed.rationale ?? "" };
	} finally {
		clearTimeout(timer);
	}
}
