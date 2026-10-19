import { Linter } from "eslint";
import { describe, expect, it } from "vitest";

import plugin from "../src/index";

/**
 * A host that keeps its skills off disk lints them in memory: every file of
 * the skill goes in `settings.skill.files`, and the rules that look past the
 * linted file read that map instead of the disk.
 */

const SKILL = "/virtual/skills/demo/SKILL.md";
const REFERENCE = "/virtual/skills/demo/references/query.md";

function skillMd(body: string): string {
	return [
		"---",
		"name: demo",
		"description: Builds the demo report. Use when the user asks for the demo report.",
		"---",
		"",
		"# demo",
		"",
		body,
		"",
	].join("\n");
}

function lintInMemory(files: Record<string, string>) {
	// A flat config matches only files under the linter's cwd, so it is the virtual root.
	const linter = new Linter({ cwd: "/virtual" });
	return linter.verify(
		files[SKILL],
		[plugin.configs.recommended, { settings: { skill: { files } } }],
		{ filename: SKILL },
	);
}

describe("in-memory skills (settings.skill.files)", () => {
	it("resolves links against the map, not the disk", () => {
		const code = skillMd("Read [the query](references/query.md).");
		expect(lintInMemory({ [SKILL]: code, [REFERENCE]: "# Query\n" })).toEqual([]);
	});

	it("reports a link whose target is not in the map", () => {
		const code = skillMd("Read [the query](references/query.md).");
		const messages = lintInMemory({ [SKILL]: code });
		expect(messages.map((m) => m.ruleId)).toEqual(["skill/no-broken-relative-links"]);
	});

	it("reports a reference file of the map that SKILL.md never links", () => {
		const code = skillMd("No pointer here.");
		const messages = lintInMemory({ [SKILL]: code, [REFERENCE]: "# Query\n" });
		expect(messages.map((m) => m.ruleId)).toEqual(["skill/no-orphan-references"]);
		expect(messages[0].message).toContain("references/query.md");
	});

	it("treats a directory as existing when the map holds a file under it", () => {
		const code = skillMd("See [the references](references/).");
		const messages = lintInMemory({ [SKILL]: code, [REFERENCE]: "# Query\n" });
		// The directory link resolves; the file under it is still an orphan.
		expect(messages.map((m) => m.ruleId)).toEqual(["skill/no-orphan-references"]);
	});
});
