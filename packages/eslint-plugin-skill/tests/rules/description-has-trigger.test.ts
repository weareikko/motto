import rule from "../../src/rules/description-has-trigger";
import { makeRuleTester, skill } from "../setup";

const F = "skills/demo/SKILL.md";
const ruleTester = makeRuleTester();

ruleTester.run("description-has-trigger", rule, {
	valid: [
		{
			filename: F,
			code: skill({ description: "Formats code. Use when the user asks." }),
		},
		{
			filename: F,
			code: skill({ description: "Runs X. Trigger on deploy requests." }),
		},
		{
			filename: F,
			code: skill({ description: "Handles APPLY requests." }),
			options: [{ patterns: ["apply"] }],
		},
	],
	invalid: [
		{
			filename: F,
			code: skill({ description: "A tool that formats code nicely." }),
			errors: [{ messageId: "noTrigger", line: 3 }],
		},
	],
});
