import rule from "../../src/rules/description-no-html";
import { makeRuleTester, skill } from "../setup";

const F = "skills/demo/SKILL.md";
const ruleTester = makeRuleTester();

ruleTester.run("description-no-html", rule, {
	valid: [
		{
			filename: F,
			code: skill({
				description: "Plain text. Use when needed. 3 < 5 is math.",
			}),
		},
	],
	invalid: [
		{
			filename: F,
			code: skill({ description: "Uses <b>bold</b>. Use when needed." }),
			errors: [{ messageId: "hasTag", data: { tag: "<b>" } }],
		},
		{
			filename: F,
			code: skill({ description: "Self closing <br/> tag. Use when." }),
			errors: [{ messageId: "hasTag" }],
		},
	],
});
