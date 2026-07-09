import rule from "../../src/rules/valid-allowed-tools";
import { makeRuleTester, skill } from "../setup";

const F = "skills/demo/SKILL.md";
const ruleTester = makeRuleTester();

ruleTester.run("valid-allowed-tools", rule, {
	valid: [
		// Absent — unrestricted, nothing to validate.
		{ filename: F, code: skill({ description: "x" }) },
		{
			filename: F,
			code: "---\nname: demo\ndescription: x\nallowed-tools: [Bash, Read]\n---\n\n# demo\n",
		},
	],
	invalid: [
		{
			filename: F,
			code: "---\nname: demo\ndescription: x\nallowed-tools: Bash\n---\n\n# demo\n",
			errors: [{ messageId: "notArray" }],
		},
		{
			filename: F,
			code: "---\nname: demo\ndescription: x\nallowed-tools: []\n---\n\n# demo\n",
			errors: [{ messageId: "empty" }],
		},
		{
			filename: F,
			code: "---\nname: demo\ndescription: x\nallowed-tools: [Bash, '']\n---\n\n# demo\n",
			errors: [{ messageId: "invalidEntry" }],
		},
	],
});
