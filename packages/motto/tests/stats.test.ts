import { describe, it, expect } from "vitest";
import { wilson, band } from "../src/stats/index";

describe("wilson", () => {
	it("n=0 is fully uninformative", () => {
		expect(wilson(0, 0)).toEqual({ lo: 0, hi: 1, point: 0 });
	});

	it("matches the known 4/5 interval (~[0.38, 0.96])", () => {
		const { lo, hi, point } = wilson(4, 5);
		expect(point).toBeCloseTo(0.8, 5);
		expect(lo).toBeCloseTo(0.3755, 3);
		expect(hi).toBeCloseTo(0.9638, 3);
	});

	it("a perfect record still carries width at small n (rule-of-three territory)", () => {
		// 20/20 is a common "surely this is 100%" case, but at n=20 the 95%
		// Wilson lower bound is only ~0.84 — nowhere near enough evidence to
		// rule out a true rate as low as 85%. This is exactly the case the
		// CI-based band() below is designed to not overclaim on.
		const { lo, hi } = wilson(20, 20);
		expect(lo).toBeCloseTo(0.8389, 3);
		expect(hi).toBeCloseTo(1, 5);
	});

	it("a perfect record at larger n clears the 0.95 lower bound", () => {
		const { lo, hi } = wilson(100, 100);
		expect(lo).toBeGreaterThanOrEqual(0.95);
		expect(hi).toBeCloseTo(1, 5);
	});

	it("0/20 stays comfortably inside the low range", () => {
		const { lo, hi } = wilson(0, 20);
		expect(lo).toBeCloseTo(0, 5);
		expect(hi).toBeCloseTo(0.1611, 3);
	});

	it("rejects passed > n instead of silently producing NaN", () => {
		expect(() => wilson(25, 20)).toThrow(RangeError);
	});

	it("rejects negative n", () => {
		expect(() => wilson(5, -3)).toThrow(RangeError);
	});

	it("rejects negative passed", () => {
		expect(() => wilson(-5, 20)).toThrow(RangeError);
	});
});

describe("band", () => {
	it("4/5 is uncertain: the CI spans rarely..always", () => {
		expect(band(4, 5).band).toBe("uncertain");
	});

	it("0/20 is a definite 'rarely': the whole CI sits under 0.5", () => {
		expect(band(0, 20).band).toBe("rarely");
	});

	it("20/20 is 'uncertain' at n=20 — the CI still dips into 'usually'", () => {
		// This is the whole point of using the CI instead of the raw
		// proportion: passed === n is not, by itself, enough evidence to
		// commit to "always" until n is large enough (~73+ for a perfect
		// record) that the Wilson lower bound clears 0.95.
		expect(band(20, 20).band).toBe("uncertain");
	});

	it("100/100 is a definite 'always': the whole CI sits at/above 0.95", () => {
		expect(band(100, 100).band).toBe("always");
	});

	it("n=0 (no data) is uncertain", () => {
		expect(band(0, 0).band).toBe("uncertain");
	});

	it("hysteresis: a new interval that still overlaps prev's range keeps prev", () => {
		// Committed as "usually" from a strong earlier run. A noisy 4/5 rerun
		// produces a wide, boundary-straddling CI that on its own would be
		// "uncertain" — but that CI still overlaps the "usually" [0.8, 0.95]
		// range, so the committed band should not flicker.
		const result = band(4, 5, { prev: "usually" });
		expect(result.band).toBe("usually");
	});

	it("hysteresis: an interval that has moved entirely clear of prev's range changes it", () => {
		// prev committed as "always" ([0.95, 1]); 0/20's CI ([~0, 0.16]) does
		// not overlap that range at all, so the band is free to move — here
		// to the raw classification, "rarely".
		const result = band(0, 20, { prev: "always" });
		expect(result.band).toBe("rarely");
	});

	it("hysteresis is skipped when prev is itself 'uncertain'", () => {
		const result = band(4, 5, { prev: "uncertain" });
		expect(result.band).toBe("uncertain");
	});

	it("rejects passed > n (propagates wilson's validation)", () => {
		expect(() => band(25, 20)).toThrow(RangeError);
	});
});
