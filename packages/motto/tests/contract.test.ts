import { describe, it, expect } from "vitest";
import { deriveContract } from "../src/skill/contract";

describe("deriveContract", () => {
	it("splits claim from triggers at a 'Use when' marker", () => {
		const c = deriveContract(
			"Generates a PDF invoice from an order. Use when the user asks to bill a customer or export an invoice.",
		);
		expect(c.hasTriggerCue).toBe(true);
		expect(c.claim).toBe("Generates a PDF invoice from an order");
		expect(c.triggers.length).toBeGreaterThanOrEqual(2);
		expect(c.positivePrompts).toHaveLength(c.triggers.length);
		expect(c.positivePrompts[0]).toMatch(/^I need help with/);
	});

	it("prefers the longer/earlier marker", () => {
		const c = deriveContract(
			"Does a thing. Use this skill when investigating incidents.",
		);
		expect(c.claim).toBe("Does a thing");
		expect(c.triggers).toContain("investigating incidents");
	});

	it("handles a description with no trigger cue", () => {
		const c = deriveContract("Formats TypeScript source files with Prettier.");
		expect(c.hasTriggerCue).toBe(false);
		expect(c.triggers).toEqual([]);
		expect(c.claim).toBe("Formats TypeScript source files with Prettier.");
		expect(c.positivePrompts).toHaveLength(1);
	});

	it("returns an empty contract for an empty description", () => {
		const c = deriveContract("");
		expect(c.claim).toBe("");
		expect(c.positivePrompts).toEqual([]);
	});

	it("splits a comma/and/or trigger list into distinct cues", () => {
		const c = deriveContract(
			"X. Use when deploying, rolling back, or scaling a service.",
		);
		expect(c.triggers).toEqual(
			expect.arrayContaining(["deploying", "rolling back", "scaling a service"]),
		);
	});
});
