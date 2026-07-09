import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { parseSkill } from "../src/skill/parse";
import { measureCost } from "../src/metrics/cost";

const SPLIT_FIXTURE = fileURLToPath(
	new URL(
		"../../../docs/research/fixtures/reference-split-vs-consolidate/split",
		import.meta.url,
	),
);

describe("measureCost", () => {
	const skill = parseSkill(SPLIT_FIXTURE);
	const cost = measureCost(skill);

	it("measures the always-loaded index tax (name + description)", () => {
		expect(cost.indexTokens).toBeGreaterThan(0);
		// The index entry is far cheaper than the full body.
		expect(cost.indexTokens).toBeLessThan(cost.bodyTokens);
	});

	it("measures the body and full SKILL.md", () => {
		expect(cost.bodyTokens).toBeGreaterThan(0);
		expect(cost.skillMdTokens).toBeGreaterThanOrEqual(cost.bodyTokens);
	});

	it("measures each reference file", () => {
		expect(cost.references).toHaveLength(3);
		expect(cost.references.every((r) => r.exists && r.tokens > 0)).toBe(true);
	});

	it("worst case equals SKILL.md plus every reference", () => {
		expect(cost.onDemandTotalTokens).toBe(
			cost.references.reduce((s, r) => s + r.tokens, 0),
		);
		expect(cost.worstCaseTokens).toBe(
			cost.skillMdTokens + cost.onDemandTotalTokens,
		);
	});

	it("worst case is dominated by references for a reference-kind skill", () => {
		expect(cost.onDemandTotalTokens).toBeGreaterThan(cost.skillMdTokens);
	});
});
