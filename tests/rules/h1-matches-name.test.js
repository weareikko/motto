import rule from "../../src/rules/h1-matches-name.js";
import { makeRuleTester, skill } from "../setup.js";

const F = "skills/demo/SKILL.md";
const ruleTester = makeRuleTester();

ruleTester.run("h1-matches-name", rule, {
	valid: [
		{
			filename: F,
			code: skill({ name: "my-skill", body: "# my-skill\n\nText.\n" }),
		},
		// Title-cased variant normalizes to the same value.
		{
			filename: F,
			code: skill({ name: "my-skill", body: "# My Skill\n\nText.\n" }),
		},
	],
	invalid: [
		{
			filename: F,
			code: skill({ name: "my-skill", body: "# Totally Different\n\nText.\n" }),
			errors: [
				{
					messageId: "mismatch",
					data: { title: "Totally Different", name: "my-skill" },
				},
			],
		},
	],
});
