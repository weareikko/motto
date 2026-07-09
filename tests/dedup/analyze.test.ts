import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { analyzeReferences } from "../../src/dedup/analyze";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "..", "fixtures", "dedup");

describe("analyzeReferences", () => {
	it("flags byte-identical references shared across sibling skills", () => {
		const result = analyzeReferences(join(fixtures, "cro-plugin"));
		const relPaths = result.duplicates.map((d) => d.relPath).sort();
		expect(relPaths).toEqual(["shared-setup.md"]);
		const shared = result.duplicates[0];
		expect(shared.files.map((f) => f.skillName).sort()).toEqual([
			"skill-a",
			"skill-b",
		]);
	});

	it("flags same-filename references that have diverged as errors", () => {
		const result = analyzeReferences(join(fixtures, "cro-plugin"));
		expect(result.divergences).toHaveLength(1);
		expect(result.divergences[0].relPath).toBe("query.md");
		expect(result.divergences[0].severity).toBe("error");
		expect(result.divergences[0].groups).toHaveLength(2);
	});

	it("does not flag files unique to a single skill", () => {
		const result = analyzeReferences(join(fixtures, "cro-plugin"));
		const flagged = [
			...result.duplicates.map((d) => d.relPath),
			...result.divergences.map((d) => d.relPath),
		];
		expect(flagged).not.toContain("unique-a.md");
		expect(flagged).not.toContain("unique-b.md");
	});

	it("suppresses a filename via ignoreRelPaths", () => {
		const result = analyzeReferences(join(fixtures, "cro-plugin"), {
			ignoreRelPaths: ["query.md"],
		});
		expect(result.divergences).toHaveLength(0);
	});

	it("isolates comparison scopes by enclosing plugin directory", () => {
		// other-plugin/skill-c carries a byte-identical copy of shared-setup.md,
		// but lives under a different plugin scope than cro-plugin — must not
		// be reported as a cross-scope duplicate.
		const result = analyzeReferences(fixtures);
		const sharedSetupDuplicates = result.duplicates.filter(
			(d) => d.relPath === "shared-setup.md",
		);
		for (const dup of sharedSetupDuplicates) {
			const skillNames = dup.files.map((f) => f.skillName);
			expect(skillNames).not.toContain("skill-c");
		}
	});

	it("merges all skills into one scope with scope: 'repo'", () => {
		const result = analyzeReferences(fixtures, { scope: "repo" });
		const sharedSetupDuplicates = result.duplicates.filter(
			(d) => d.relPath === "shared-setup.md",
		);
		// skill-a, skill-b, and skill-c all collapse into one duplicate group.
		expect(sharedSetupDuplicates).toHaveLength(1);
		expect(sharedSetupDuplicates[0].files.map((f) => f.skillName).sort()).toEqual([
			"skill-a",
			"skill-b",
			"skill-c",
		]);
	});

	it("detects near-duplicates only when opted in", () => {
		const off = analyzeReferences(join(fixtures, "near-dup-plugin"));
		expect(off.nearDuplicates).toHaveLength(0);

		const on = analyzeReferences(join(fixtures, "near-dup-plugin"), {
			nearDuplicates: true,
		});
		expect(on.nearDuplicates).toHaveLength(1);
		expect(on.nearDuplicates[0].similarity).toBeGreaterThan(0.75);
	});

	it("reproduces the real CRO case end-to-end", () => {
		// Regression guard for the case that motivated this feature.
		const result = analyzeReferences(join(fixtures, "cro-plugin"));
		expect(result.duplicates.map((d) => d.relPath).sort()).toEqual([
			"shared-setup.md",
		]);
		expect(result.divergences.map((d) => d.relPath).sort()).toEqual([
			"query.md",
		]);
	});
});
