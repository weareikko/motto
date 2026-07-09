import { describe, expect, it } from "vitest";

import { scopeKeyFor } from "../../src/dedup/discover";

describe("scopeKeyFor", () => {
	it("scopes sibling skills to their enclosing plugin directory", () => {
		const root = "/repo";
		const skillDir = "/repo/plugins/cro/skills/ga4-funnel-performance";
		expect(scopeKeyFor(skillDir, root)).toBe("/repo/plugins/cro");
	});

	it("falls back to the analysis root when there is no `skills/` ancestor", () => {
		const root = "/repo";
		const skillDir = "/repo/standalone-skill";
		expect(scopeKeyFor(skillDir, root)).toBe(root);
	});
});
