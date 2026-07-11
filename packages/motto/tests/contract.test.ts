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

	it("detects French trigger cues (À utiliser quand / Déclencher quand)", () => {
		const c = deriveContract(
			"Gère les branches Git avec Git Flow. À utiliser quand l'utilisateur démarre une feature, ou parle du process de release.",
		);
		expect(c.hasTriggerCue).toBe(true);
		expect(c.claim).toBe("Gère les branches Git avec Git Flow");
		expect(c.triggers.length).toBeGreaterThanOrEqual(2);
	});

	it("detects the 'Use to …' idiom", () => {
		const c = deriveContract(
			"Diagnoses funnel drop-off. Use to find where a funnel drops off, or compare a segment against the overall funnel.",
		);
		expect(c.hasTriggerCue).toBe(true);
		expect(c.claim).toBe("Diagnoses funnel drop-off");
		expect(c.triggers).toEqual(
			expect.arrayContaining(["find where a funnel drops off"]),
		);
	});

	it("does not false-match a marker substring inside the claim", () => {
		// "use to" appears mid-claim; the real cue is the trailing "Use when".
		const c = deriveContract(
			"A helper you use to format code. Use when formatting a file.",
		);
		expect(c.claim).toBe("A helper you use to format code");
		expect(c.triggers).toContain("formatting a file");
	});

	it("scopes the trigger clause to its own sentence", () => {
		const c = deriveContract(
			"Writes a changelog. À utiliser quand l'utilisateur ajoute une entrée. Couvre les workflows détaillés.",
		);
		// The trailing "Couvre les workflows…" sentence is not a trigger.
		expect(c.triggers.join(" ")).not.toMatch(/Couvre/i);
	});
});
