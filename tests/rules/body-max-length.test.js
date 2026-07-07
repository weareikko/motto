import rule from "../../src/rules/body-max-length.js";
import { makeRuleTester, skill } from "../setup.js";

const F = "skills/demo/SKILL.md";
const ruleTester = makeRuleTester();

const bigBody = "# demo\n" + "\nline".repeat(30);

ruleTester.run("body-max-length", rule, {
	valid: [
		{ filename: F, code: skill({ body: "# demo\n\nShort body.\n" }) },
		{ filename: F, code: skill({ body: bigBody }), options: [{ maxLines: 500 }] },
	],
	invalid: [
		{
			filename: F,
			code: skill({ body: bigBody }),
			options: [{ maxLines: 10 }],
			errors: [{ messageId: "tooLong" }],
		},
	],
});
