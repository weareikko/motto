import { describe, expect, it } from "vitest";

import { formatReport } from "../../src/dedup/report";
import type { AnalyzeResult } from "../../src/dedup/types";

const empty: AnalyzeResult = { duplicates: [], divergences: [], nearDuplicates: [] };

describe("formatReport", () => {
	it("reports cleanly when nothing was found", () => {
		expect(formatReport(empty)).toContain("No cross-skill reference duplication");
	});

	it("summarizes counts and mentions skill names", () => {
		const result: AnalyzeResult = {
			duplicates: [
				{
					type: "duplicate",
					severity: "warn",
					scope: "/repo/plugins/cro",
					relPath: "setup.md",
					hash: "abc",
					files: [
						{ skillName: "skill-a", absPath: "/repo/plugins/cro/skills/skill-a/references/setup.md" },
						{ skillName: "skill-b", absPath: "/repo/plugins/cro/skills/skill-b/references/setup.md" },
					],
				},
			],
			divergences: [],
			nearDuplicates: [],
		};
		const text = formatReport(result);
		expect(text).toContain("skill-a");
		expect(text).toContain("skill-b");
		expect(text).toContain("1 duplicate(s), 0 divergence(s), 0 near-duplicate(s)");
	});
});
