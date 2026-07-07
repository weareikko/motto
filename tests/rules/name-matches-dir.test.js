import rule from "../../src/rules/name-matches-dir.js";
import { makeRuleTester, skill } from "../setup.js";

const ruleTester = makeRuleTester();

ruleTester.run("name-matches-dir", rule, {
	valid: [
		{
			filename: "skills/my-skill/SKILL.md",
			code: skill({ name: "my-skill", description: "x" }),
		},
		// No resolvable directory (RuleTester default filename) — stays silent.
		{
			filename: "SKILL.md",
			code: skill({ name: "anything", description: "x" }),
		},
	],
	invalid: [
		{
			filename: "skills/my-skill/SKILL.md",
			code: skill({ name: "other-name", description: "x" }),
			errors: [
				{
					messageId: "mismatch",
					line: 2,
					data: { name: "other-name", dir: "my-skill" },
				},
			],
		},
	],
});
