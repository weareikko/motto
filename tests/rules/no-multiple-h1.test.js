import rule from "../../src/rules/no-multiple-h1.js";
import { makeRuleTester, skill } from "../setup.js";

const F = "skills/demo/SKILL.md";
const ruleTester = makeRuleTester();

ruleTester.run("no-multiple-h1", rule, {
	valid: [
		{ filename: F, code: skill({ body: "# demo\n\n## sub\n\nText.\n" }) },
		// No H1 at all is allowed — the standard format is `##`-first.
		{ filename: F, code: skill({ body: "## Overview\n\nText.\n" }) },
		{ filename: F, code: skill({ body: "Just prose, no headings.\n" }) },
	],
	invalid: [
		{
			filename: F,
			code: skill({ body: "# one\n\n# two\n" }),
			errors: [{ messageId: "multiple", data: { count: "2" } }],
		},
	],
});
