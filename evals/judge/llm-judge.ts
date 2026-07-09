/**
 * LLM judge for evals, routed through Cloudflare AI Gateway.
 *
 * Deliberately dependency-free: a direct HTTPS call to the gateway's
 * OpenAI-compatible chat/completions endpoint, so evals don't pull in a
 * provider SDK. The judge model is configurable so a benchmark can be scored
 * by a *different* model than the one under test (avoiding self-preference),
 * per the user's "different models and judges" requirement.
 *
 * Required env (skip the judge cleanly if absent):
 *   CF_AI_GATEWAY_URL   e.g. https://gateway.ai.cloudflare.com/v1/<acct>/<gw>/compat
 *   CF_AI_GATEWAY_TOKEN  bearer token
 *   EVAL_JUDGE_MODEL     e.g. openai/gpt-5.4-mini  (default below)
 */

const DEFAULT_JUDGE_MODEL = "openai/gpt-5.4-mini";

export interface JudgeVerdict {
	score: 0 | 1;
	rationale: string;
}

export function judgeAvailable(): { available: boolean; reason?: string } {
	if (!(process.env.CF_AI_GATEWAY_URL ?? "").trim())
		return { available: false, reason: "CF_AI_GATEWAY_URL unset" };
	if (!(process.env.CF_AI_GATEWAY_TOKEN ?? "").trim())
		return { available: false, reason: "CF_AI_GATEWAY_TOKEN unset" };
	return { available: true };
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
	const url = process.env.CF_AI_GATEWAY_URL!.replace(/\/$/, "");
	const token = process.env.CF_AI_GATEWAY_TOKEN!;
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
		const res = await fetch(`${url}/chat/completions`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: `Bearer ${token}`,
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
		if (!match) return { score: 0, rationale: `unparseable judge reply: ${content.slice(0, 120)}` };
		const parsed = JSON.parse(match[0]) as JudgeVerdict;
		return { score: parsed.score === 1 ? 1 : 0, rationale: parsed.rationale ?? "" };
	} finally {
		clearTimeout(timer);
	}
}
