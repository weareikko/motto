/**
 * Shared RuleTester configured for the markdown language with YAML frontmatter.
 *
 * Every rule no-ops unless the linted file is named `SKILL.md`, so test cases
 * must set a `filename` ending in `SKILL.md`.
 */

import { RuleTester } from "eslint";
import markdown from "@eslint/markdown";

export function makeRuleTester() {
	return new RuleTester({
		plugins: { markdown },
		language: "markdown/gfm",
		languageOptions: { frontmatter: "yaml" },
	});
}

/** A syntactically valid SKILL.md body used as a shared fixture prefix. */
export function skill({ name = "demo", description, body } = {}) {
	const fm = ["---", `name: ${name}`];
	if (description !== undefined) {
		fm.push(`description: ${description}`);
	}
	fm.push("---", "");
	const content = body ?? `# ${name}\n\nBody.\n`;
	return fm.join("\n") + content;
}
