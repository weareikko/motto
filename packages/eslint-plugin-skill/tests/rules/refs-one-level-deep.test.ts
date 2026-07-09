import rule from "../../src/rules/refs-one-level-deep";
import { makeRuleTester, skill } from "../setup";

const F = "skills/demo/SKILL.md";
const ruleTester = makeRuleTester();

ruleTester.run("refs-one-level-deep", rule, {
	valid: [
		{
			filename: F,
			code: skill({
				body: "# demo\n\n[ref](references/setup.md) [same-dir](./notes.md) [ext](https://x.io) [anchor](#s).\n",
			}),
		},
	],
	invalid: [
		{
			filename: F,
			code: skill({ body: "# demo\n\n[deep](references/sub/setup.md)\n" }),
			errors: [{ messageId: "tooDeep", data: { url: "references/sub/setup.md" } }],
		},
		{
			filename: F,
			code: skill({ body: "# demo\n\n[up](../shared/setup.md)\n" }),
			errors: [{ messageId: "escapes", data: { url: "../shared/setup.md" } }],
		},
	],
});
