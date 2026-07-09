/**
 * Shared RuleTester configured for the markdown language with YAML frontmatter,
 * wired to Vitest's test hooks.
 *
 * Every rule no-ops unless the linted file is named `SKILL.md`, so test cases
 * must set a `filename` ending in `SKILL.md`.
 */

import { RuleTester } from "eslint";
import markdown from "@eslint/markdown";
import { afterAll, describe, it } from "vitest";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

export function makeRuleTester(): RuleTester {
	return new RuleTester({
		plugins: { markdown },
		language: "markdown/gfm",
		languageOptions: { frontmatter: "yaml" },
	});
}

/** Build a syntactically valid SKILL.md from parts. */
export function skill({
	name = "demo",
	description,
	body,
}: {
	name?: string;
	description?: string;
	body?: string;
} = {}): string {
	const fm = ["---", `name: ${name}`];
	if (description !== undefined) {
		fm.push(`description: ${description}`);
	}
	fm.push("---", "");
	const content = body ?? `# ${name}\n\nBody.\n`;
	return fm.join("\n") + content;
}
