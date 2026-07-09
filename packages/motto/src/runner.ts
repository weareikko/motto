/**
 * Cross-harness × cross-model benchmark runner.
 *
 * Given a benchmark (a set of cases + a per-case grader), runs every case on
 * every available harness at every model in the sweep, N times, and returns
 * comparable rows. This is the reusable core the `.eval.ts` files build on so
 * a research finding can be re-checked across agent implementations and models
 * from one definition.
 */

import type { Harness, HarnessResult } from "./harness/index";
import { availableHarnesses } from "./harness/index";
import { modelsFromEnv, type ModelSpec } from "./config";

export interface BenchmarkCase<Ctx = unknown> {
	id: string;
	prompt: string;
	skillPath: string;
	ctx?: Ctx;
}

export interface GradedTrial<Ctx = unknown> {
	harness: string;
	model: string;
	caseId: string;
	trial: number;
	pass: boolean;
	detail?: string;
	result: HarnessResult;
	ctx?: Ctx;
}

export interface Benchmark<Ctx = unknown> {
	name: string;
	cases: BenchmarkCase<Ctx>[];
	/** Grade one harness result for a case. May be async (e.g. LLM judge). */
	grade: (
		result: HarnessResult,
		c: BenchmarkCase<Ctx>,
	) => boolean | { pass: boolean; detail?: string } | Promise<boolean | { pass: boolean; detail?: string }>;
	/** Trials per (harness × model × case). Default 20 for statistical weight. */
	n?: number;
	timeoutMs?: number;
}

export interface BenchmarkReport<Ctx = unknown> {
	name: string;
	rows: {
		harness: string;
		model: string;
		caseId: string;
		n: number;
		passed: number;
		accuracy: number;
	}[];
	trials: GradedTrial<Ctx>[];
}

export async function runBenchmark<Ctx>(
	bench: Benchmark<Ctx>,
	opts: { harnesses?: Harness[]; models?: ModelSpec[] } = {},
): Promise<BenchmarkReport<Ctx>> {
	const harnesses = opts.harnesses ?? (await availableHarnesses());
	const models = opts.models ?? modelsFromEnv();
	const n = bench.n ?? 20;
	const trials: GradedTrial<Ctx>[] = [];

	for (const harness of harnesses) {
		for (const model of models) {
			const modelId = model.perHarness[harness.id];
			for (const c of bench.cases) {
				for (let t = 0; t < n; t++) {
					const result = await harness.run({
						skillPath: c.skillPath,
						prompt: c.prompt,
						model: modelId,
						timeoutMs: bench.timeoutMs,
					});
					const graded = await bench.grade(result, c);
					const norm =
						typeof graded === "boolean" ? { pass: graded } : graded;
					trials.push({
						harness: harness.id,
						model: model.label,
						caseId: c.id,
						trial: t + 1,
						pass: norm.pass,
						detail: norm.detail,
						result,
						ctx: c.ctx,
					});
				}
			}
		}
	}

	const rowMap = new Map<string, { passed: number; n: number }>();
	for (const tr of trials) {
		const key = `${tr.harness}|${tr.model}|${tr.caseId}`;
		const row = rowMap.get(key) ?? { passed: 0, n: 0 };
		row.n++;
		if (tr.pass) row.passed++;
		rowMap.set(key, row);
	}
	const rows = [...rowMap.entries()].map(([key, v]) => {
		const [harness, model, caseId] = key.split("|");
		return {
			harness,
			model,
			caseId,
			n: v.n,
			passed: v.passed,
			accuracy: v.n ? Math.round((v.passed / v.n) * 1000) / 1000 : 0,
		};
	});

	return { name: bench.name, rows, trials };
}
