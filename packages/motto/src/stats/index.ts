/**
 * Pure statistics for turning a handful of pass/fail trials into a label a
 * human (or a golden file) can trust — no dependencies, no I/O.
 *
 * Behavioral evals are stochastic: running the same skill against the same
 * harness twice will not always produce the same pass count. A naive
 * `passed/n >= threshold` classifier flickers between labels run to run,
 * which is fatal for a *committed* golden file (every rerun would look like
 * a regression or an improvement). `band()` fixes this two ways:
 *
 *   1. It classifies on the Wilson score confidence interval, not the raw
 *      proportion — a band is only "definite" when the WHOLE interval sits
 *      inside a single band's range. A wide interval (small `n`, or a
 *      proportion near a boundary) yields "uncertain" instead of guessing.
 *   2. It supports hysteresis: given the previously committed band, a new
 *      result that still overlaps that band's range does not flip the
 *      label. Only a CI that has moved entirely clear of the old band's
 *      range is allowed to change it.
 */

/** A qualitative reliability label for a skill's behavioral pass rate. */
export type Band = "always" | "usually" | "mixed" | "rarely" | "uncertain";

export interface WilsonInterval {
	/** Lower bound of the confidence interval, clamped to [0, 1]. */
	lo: number;
	/** Upper bound of the confidence interval, clamped to [0, 1]. */
	hi: number;
	/** Raw point estimate `passed / n` (0 when `n` is 0). */
	point: number;
}

/**
 * Wilson score interval for a binomial proportion — more honest than a
 * Wald/normal-approximation interval at small `n` or when the proportion is
 * near 0 or 1 (where the naive interval degenerates to zero width).
 *
 * `z` defaults to 1.96 (~95% two-sided confidence).
 */
export function wilson(passed: number, n: number, z = 1.96): WilsonInterval {
	if (n < 0 || passed < 0) {
		throw new RangeError(`wilson: passed (${passed}) and n (${n}) must both be >= 0`);
	}
	if (passed > n) {
		throw new RangeError(`wilson: passed (${passed}) cannot exceed n (${n})`);
	}
	if (n === 0) return { lo: 0, hi: 1, point: 0 };

	const phat = passed / n;
	const z2 = z * z;
	const denom = 1 + z2 / n;
	const center = phat + z2 / (2 * n);
	const margin = z * Math.sqrt((phat * (1 - phat)) / n + z2 / (4 * n * n));

	return {
		// Clamp — floating point can push the raw bound a hair outside [0, 1]
		// (e.g. a tiny negative lo when passed === 0).
		lo: Math.max(0, (center - margin) / denom),
		hi: Math.min(1, (center + margin) / denom),
		point: phat,
	};
}

type NamedBand = Exclude<Band, "uncertain">;

/**
 * Band ranges, most-permissive-to-pass first. Contiguous and partition
 * [0, 1]: "always" is closed at both ends (a proportion of exactly 1 is
 * possible), the rest are half-open on their upper edge.
 */
const BAND_RANGES: Record<NamedBand, readonly [number, number]> = {
	always: [0.95, 1],
	usually: [0.8, 0.95],
	mixed: [0.5, 0.8],
	rarely: [0, 0.5],
};

/** Classify a single proportion value via the plain threshold cascade. */
function classifyPoint(value: number): NamedBand {
	if (value >= 0.95) return "always";
	if (value >= 0.8) return "usually";
	if (value >= 0.5) return "mixed";
	return "rarely";
}

/** True if `[lo, hi]` and a named band's range share any point. */
function overlapsRange(lo: number, hi: number, range: readonly [number, number]): boolean {
	return lo <= range[1] && hi >= range[0];
}

export interface BandResult extends WilsonInterval {
	band: Band;
}

/**
 * Assign a reliability band to `passed/n` trials.
 *
 * A definite band ("always" | "usually" | "mixed" | "rarely") is assigned
 * only when the WHOLE Wilson interval `[lo, hi]` falls inside that band's
 * range — equivalently, `classifyPoint(lo) === classifyPoint(hi)`. When the
 * interval straddles a band boundary, the raw result is "uncertain".
 *
 * With `opts.prev` set, hysteresis applies: if the new interval still
 * overlaps `prev`'s range at all, the previous band is kept as-is (even if
 * the raw classification above would say "uncertain" or a different named
 * band). The committed band only changes once the new evidence has moved
 * entirely clear of it — this is what stops a golden file from flickering
 * on ordinary eval noise.
 */
export function band(passed: number, n: number, opts?: { prev?: Band }): BandResult {
	const ci = wilson(passed, n);
	const loBand = classifyPoint(ci.lo);
	const hiBand = classifyPoint(ci.hi);
	const raw: Band = loBand === hiBand ? loBand : "uncertain";

	const prev = opts?.prev;
	if (prev && prev !== "uncertain" && overlapsRange(ci.lo, ci.hi, BAND_RANGES[prev])) {
		return { band: prev, ...ci };
	}

	return { band: raw, ...ci };
}
