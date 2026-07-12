import { describe, it, expect } from "vitest";
import { PRIORS, getPrior } from "../src/priors/index";

describe("PRIORS", () => {
	it("has exactly the baseline, calibration, and orchestration priors", () => {
		expect(PRIORS.map((p) => p.id).toSorted()).toEqual(
			["baseline", "calibration", "orchestration"].toSorted(),
		);
	});

	it("baseline injects no temperament", () => {
		const baseline = getPrior("baseline");
		expect(baseline?.block).toBe("");
	});

	it("calibration and orchestration inject non-empty blocks", () => {
		expect(getPrior("calibration")?.block.length).toBeGreaterThan(0);
		expect(getPrior("orchestration")?.block.length).toBeGreaterThan(0);
	});
});

describe("getPrior", () => {
	it("round-trips every id in PRIORS", () => {
		for (const prior of PRIORS) {
			expect(getPrior(prior.id)).toEqual(prior);
		}
	});

	it("returns undefined for an unknown id", () => {
		expect(getPrior("does-not-exist")).toBeUndefined();
	});
});
