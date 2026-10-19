import { describe, expect, it } from "vitest";

import { analyzeSkills } from "../../src/dedup/analyze";

describe("analyzeSkills (in memory)", () => {
	const skills = [
		{
			name: "skill-a",
			references: [
				{ relPath: "tone.md", content: "# Tone\n\nPlain.\n" },
				{ relPath: "query.md", content: "# Query\n\nVersion A.\n" },
			],
		},
		{
			name: "skill-b",
			references: [
				{ relPath: "tone.md", content: "# Tone\n\nPlain.\n" },
				{ relPath: "query.md", content: "# Query\n\nVersion B.\n" },
			],
		},
	];

	it("finds duplicates and divergences across the skills passed", () => {
		const result = analyzeSkills(skills);
		expect(result.duplicates.map((d) => d.relPath)).toEqual(["tone.md"]);
		expect(result.divergences.map((d) => d.relPath)).toEqual(["query.md"]);
		expect(result.divergences[0].groups.flatMap((g) => g.files.map((f) => f.absPath)).sort()).toEqual([
			"skill-a/references/query.md",
			"skill-b/references/query.md",
		]);
	});

	it("compares only skills of the same scope", () => {
		const result = analyzeSkills(skills.map((skill) => ({ ...skill, scope: skill.name })));
		expect(result.duplicates).toEqual([]);
		expect(result.divergences).toEqual([]);
	});

	it("skips the ignored paths", () => {
		const result = analyzeSkills(skills, { ignoreRelPaths: ["query.md"] });
		expect(result.divergences).toEqual([]);
	});
});
