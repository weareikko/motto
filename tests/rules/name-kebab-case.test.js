import rule from "../../src/rules/name-kebab-case.js";
import { makeRuleTester, skill } from "../setup.js";

const F = "skills/demo/SKILL.md";
const ruleTester = makeRuleTester();

ruleTester.run("name-kebab-case", rule, {
	valid: [
		{ filename: F, code: skill({ name: "my-skill", description: "x" }) },
		{ filename: F, code: skill({ name: "a", description: "x" }) },
		{ filename: F, code: skill({ name: "skill2-v2", description: "x" }) },
	],
	invalid: [
		{
			filename: F,
			code: skill({ name: "Bad_Name", description: "x" }),
			errors: [{ messageId: "notKebab", line: 2 }],
		},
		{
			filename: F,
			code: skill({ name: "1-leading-digit", description: "x" }),
			errors: [{ messageId: "notKebab" }],
		},
		{
			filename: F,
			code: skill({ name: "trailing-", description: "x" }),
			errors: [{ messageId: "notKebab" }],
		},
	],
});
