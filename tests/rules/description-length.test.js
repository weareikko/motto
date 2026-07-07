import rule from "../../src/rules/description-length.js";
import { makeRuleTester, skill } from "../setup.js";

const F = "skills/demo/SKILL.md";
const ruleTester = makeRuleTester();

const long = "a".repeat(1025);

ruleTester.run("description-length", rule, {
	valid: [
		{ filename: F, code: skill({ description: "short enough" }) },
		{
			filename: F,
			code: skill({ description: "a".repeat(1024) }),
		},
		// Custom, larger cap.
		{
			filename: F,
			code: skill({ description: long }),
			options: [{ max: 2000 }],
		},
	],
	invalid: [
		{
			filename: F,
			code: skill({ description: long }),
			errors: [{ messageId: "tooLong", data: { length: "1025", max: "1024" } }],
		},
		{
			filename: F,
			code: skill({ description: "a".repeat(20) }),
			options: [{ max: 10 }],
			errors: [{ messageId: "tooLong", data: { length: "20", max: "10" } }],
		},
	],
});
