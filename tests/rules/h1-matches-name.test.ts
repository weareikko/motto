import rule from "../../src/rules/h1-matches-name";
import { makeRuleTester, skill } from "../setup";

const F = "skills/demo/SKILL.md";
const ruleTester = makeRuleTester();

ruleTester.run("h1-matches-name", rule, {
	valid: [
		{
			filename: F,
			code: skill({ name: "my-skill", body: "# my-skill\n\nText.\n" }),
		},
		{
			filename: F,
			code: skill({ name: "my-skill", body: "# My Skill\n\nText.\n" }),
		},
	],
	invalid: [
		{
			filename: F,
			code: skill({
				name: "my-skill",
				body: "# Totally Different\n\nText.\n",
			}),
			errors: [
				{
					messageId: "mismatch",
					data: { title: "Totally Different", name: "my-skill" },
				},
			],
		},
	],
});
