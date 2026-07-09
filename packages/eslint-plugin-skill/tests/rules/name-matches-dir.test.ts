import rule from "../../src/rules/name-matches-dir";
import { makeRuleTester, skill } from "../setup";

const ruleTester = makeRuleTester();

ruleTester.run("name-matches-dir", rule, {
	valid: [
		{
			filename: "skills/my-skill/SKILL.md",
			code: skill({ name: "my-skill", description: "x" }),
		},
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
