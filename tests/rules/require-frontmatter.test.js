import rule from "../../src/rules/require-frontmatter.js";
import { makeRuleTester } from "../setup.js";

const F = "skills/demo/SKILL.md";
const ruleTester = makeRuleTester();

ruleTester.run("require-frontmatter", rule, {
	valid: [
		{
			filename: F,
			code: "---\nname: demo\ndescription: A thing. Use when needed.\n---\n\n# demo\n\nBody.\n",
		},
		// Not a skill file — rule stays silent.
		{
			filename: "notes.md",
			code: "# just a doc\n",
		},
	],
	invalid: [
		{
			filename: F,
			code: "# no frontmatter here\n",
			errors: [{ messageId: "missingFrontmatter", line: 1 }],
		},
		{
			filename: F,
			code: "---\nname: demo\n---\n\n# demo\n",
			errors: [{ messageId: "missingKey", data: { key: "description" } }],
		},
		{
			filename: F,
			code: "---\nname: demo\ndescription: ''\n---\n\n# demo\n",
			errors: [{ messageId: "emptyKey", line: 3 }],
		},
	],
});
