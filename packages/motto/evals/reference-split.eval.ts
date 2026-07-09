/**
 * Cross-harness re-run of the reference split-vs-consolidate benchmark
 * (docs/research/reference-split-vs-consolidate.md), using `vitest-evals`.
 *
 * The SAME question the internal-workflow research answered, re-expressed as a
 * standalone `describeEval` so it can be re-checked on any installed agent
 * harness (Claude Code / Pi / OpenCode / Codex) and across models — outside
 * the Claude Code workflow tool.
 *
 * vitest-evals owns the eval/scoring/reporter structure; our agent-CLI
 * `Harness` adapters (evals/harness) are the run mechanism vitest-evals lacks.
 * One `describeEval` suite is generated per *available* agent harness
 * (resolved once at load), so absent binaries/credentials produce no suites
 * rather than failures.
 *
 * OPT-IN: nothing runs unless RUN_EVALS=1 (real agent calls cost money).
 *   RUN_EVALS=1 npx vitest run --config vite.eval.config.ts
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// vitest-evals' own `createHarness` (eval scaffolding) — distinct from our
// agent-CLI Harness; aliased to avoid the name clash.
import type { JsonValue, JudgeContext } from "vitest-evals";
import { describe, it } from "vitest";
import { createHarness as createEvalHarness, createJudge, describeEval } from "vitest-evals";

import { availableHarnesses } from "../src/harness/index";
import { evalsEnabled } from "../src/config";

const here = dirname(fileURLToPath(import.meta.url));
// packages/motto/evals/ -> repo root is three levels up.
const FIX = join(here, "..", "..", "..", "docs", "research", "fixtures", "reference-split-vs-consolidate");

interface Input {
	layout: "consolidated" | "split";
}
// Output must be JSON-serializable (vitest-evals persists it); the index
// signature makes it assignable to the library's JsonValue constraint.
interface Output {
	answer: string;
	filesRead: string[];
	[key: string]: JsonValue;
}
type Ctx = JudgeContext<Input, Output>;

const DB_PROMPT =
	"A reference skill for on-call incident runbooks is available as SKILL.md in the current directory. " +
	"Read it (and whatever reference file it points you to) and answer: getting connection pool exhausted " +
	"errors on the primary DB during peak traffic — what command should I run, and what must I avoid?";

// Structural, model-free judges: name the safe remediation; never recommend the
// dangerous action. (For softer rubrics, evals/judge/llm-judge.ts provides an
// LLM judge via Cloudflare AI Gateway — kept regex here so scoring needs no
// credentials beyond the harness itself.)
const NamesPoolRemediation = createJudge("NamesPoolRemediation", ({ output }: Ctx) => ({
	score: /pool (drain|resize)/i.test(output.answer) ? 1 : 0,
	metadata: { rationale: "answer must name pool drain/resize remediation" },
}));

const AvoidsPrimaryRestart = createJudge("AvoidsPrimaryRestart", ({ output }: Ctx) => {
	const recommendsRestart =
		/\brestart(ing)?\b[^.]*\bprimary\b/i.test(output.answer) &&
		!/do not|don't|avoid|never/i.test(output.answer);
	return {
		score: recommendsRestart ? 0 : 1,
		metadata: { rationale: "answer must not recommend restarting the primary DB" },
	};
});

// Resolve available agent harnesses once, at collection time. `describeEval`
// must be called synchronously during module evaluation, so the async
// detection happens here via top-level await before the suites register.
const agents = evalsEnabled() ? await availableHarnesses() : [];

// Vitest requires at least one suite per file. When evals are off or no agent
// harness is runnable, register a single skipped placeholder that explains why
// rather than failing the file with "No test suite found".
if (agents.length === 0) {
	describe("reference-split (cross-harness)", () => {
		it.skip(
			evalsEnabled()
				? "no agent harness available (binary + credentials) — see `npx tsx evals/list-harnesses.ts`"
				: "evals disabled — set RUN_EVALS=1 to run",
			() => {},
		);
	});
}

for (const agent of agents) {
	const evalHarness = createEvalHarness<Input, Output>({
		name: `reference-split/${agent.id}`,
		run: async ({ input }) => {
			const skillPath = join(FIX, input.layout, "SKILL.md");
			const res = await agent.run({
				skillPath,
				prompt: DB_PROMPT,
				cwd: join(FIX, input.layout),
				timeoutMs: 120_000,
			});
			return {
				output: { answer: res.text, filesRead: res.filesRead },
				// Minimal transcript so vitest-evals can record the run.
				events: [
					{ type: "message" as const, role: "user" as const, content: DB_PROMPT },
					{ type: "message" as const, role: "assistant" as const, content: res.text },
				],
				usage: res.usage?.total ? { totalTokens: res.usage.total } : undefined,
			};
		},
	});

	describeEval(
		`reference-split — ${agent.displayName}`,
		{
			harness: evalHarness,
			judges: [NamesPoolRemediation, AvoidsPrimaryRestart],
			judgeThreshold: 1,
		},
		(it) => {
			for (const layout of ["consolidated", "split"] as const) {
				it(`${layout} layout answers safely`, async ({ run }) => {
					await run({ layout });
				});
			}
		},
	);
}
