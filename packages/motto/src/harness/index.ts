/**
 * Harness registry + availability helpers for skill research evals.
 */

import type { Harness } from "./types";
import { claudeHarness } from "./claude";
import { piHarness } from "./pi";
import { opencodeHarness } from "./opencode";
import { codexHarness } from "./codex";

export type { Harness, HarnessTask, HarnessResult } from "./types";

export const HARNESSES: Harness[] = [
	claudeHarness,
	piHarness,
	opencodeHarness,
	codexHarness,
];

export function harnessById(id: string): Harness | undefined {
	return HARNESSES.find((h) => h.id === id);
}

/** The harnesses that can actually run right now (binary + creds present). */
export async function availableHarnesses(): Promise<Harness[]> {
	const checked = await Promise.all(
		HARNESSES.map(async (h) => ({ h, det: await h.detect() })),
	);
	return checked.filter((c) => c.det.available).map((c) => c.h);
}

/** Full detection report — for a `list-harnesses` diagnostic. */
export async function detectAll(): Promise<
	{ id: string; displayName: string; available: boolean; reason?: string }[]
> {
	return Promise.all(
		HARNESSES.map(async (h) => {
			const det = await h.detect();
			return {
				id: h.id,
				displayName: h.displayName,
				available: det.available,
				reason: det.reason,
			};
		}),
	);
}
