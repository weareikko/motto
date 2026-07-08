import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { Linter } from "eslint";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import plugin from "../src/index";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "fixtures");

/** Lint a fixture SKILL.md through the `recommended` preset end-to-end. */
function lintFixture(relPath: string) {
	const filename = join(fixtures, relPath);
	const code = readFileSync(filename, "utf8");
	const linter = new Linter();
	return linter.verify(code, plugin.configs.recommended, { filename });
}

/** Lint arbitrary content at a given path through the preset. */
function lintAt(filename: string, code: string) {
	const linter = new Linter();
	return linter.verify(code, plugin.configs.recommended, { filename });
}

describe("recommended preset (end-to-end)", () => {
	it("passes a well-formed skill", () => {
		const messages = lintFixture("good-skill/SKILL.md");
		expect(messages).toEqual([]);
	});

	it("flags a broken skill with the expected rules", () => {
		const messages = lintFixture("bad-name/SKILL.md");
		const ruleIds = new Set(messages.map((m) => m.ruleId));

		expect(ruleIds).toContain("skill/name-kebab-case");
		expect(ruleIds).toContain("skill/name-matches-dir");
		expect(ruleIds).toContain("skill/description-no-html");
		expect(ruleIds).toContain("skill/no-multiple-h1");
		expect(ruleIds).toContain("skill/no-broken-relative-links");

		// Opt-in rule must not fire under the recommended preset.
		expect(ruleIds).not.toContain("skill/h1-matches-name");
	});

	it("detects an orphaned reference file", () => {
		const messages = lintFixture("orphan-skill/SKILL.md");
		const ruleIds = new Set(messages.map((m) => m.ruleId));
		expect(ruleIds).toContain("skill/no-orphan-references");
	});

	it("lints reference files under references/ (not just SKILL.md)", () => {
		const messages = lintAt(
			join(fixtures, "orphan-skill/references/doc2.md"),
			"# Doc\n\nContent.\n",
		);
		const ruleIds = new Set(messages.map((m) => m.ruleId));
		expect(ruleIds).toContain("skill/descriptive-reference-filenames");
	});

	it("validates allowed-tools shape, universally", () => {
		const messages = lintAt(
			join(fixtures, "good-skill/SKILL.md"),
			"---\nname: demo\ndescription: x. Use when needed.\nallowed-tools: []\n---\n\n# demo\n",
		);
		const ruleIds = new Set(messages.map((m) => m.ruleId));
		expect(ruleIds).toContain("skill/valid-allowed-tools");
	});

	it("keeps kind-specific rules opt-in even when a kind is declared", () => {
		const messages = lintAt(
			join(fixtures, "good-skill/SKILL.md"),
			"---\nname: demo\ndescription: x. Use when needed.\nmetadata:\n  kind: procedural\n---\n\n# demo\n\nNo steps here.\n",
		);
		const ruleIds = new Set(messages.map((m) => m.ruleId));
		expect(ruleIds).not.toContain("skill/procedural-has-steps");
	});
});
