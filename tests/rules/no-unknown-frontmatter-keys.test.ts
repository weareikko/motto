import rule from "../../src/rules/no-unknown-frontmatter-keys";
import { makeRuleTester } from "../setup";

const F = "skills/demo/SKILL.md";
const ruleTester = makeRuleTester();

ruleTester.run("no-unknown-frontmatter-keys", rule, {
	valid: [
		{
			filename: F,
			code: "---\nname: demo\ndescription: Do a thing. Use when needed.\n---\n\n# demo\n",
		},
		// Known optional keys are allowed.
		{
			filename: F,
			code: "---\nname: demo\ndescription: x\nallowed-tools: [Bash]\ndisable-model-invocation: true\n---\n\n# demo\n",
		},
		// Custom key permitted via options.
		{
			filename: F,
			code: "---\nname: demo\ndescription: x\naudience: public\n---\n\n# demo\n",
			options: [{ allow: ["audience"] }],
		},
	],
	invalid: [
		{
			filename: F,
			code: "---\nname: demo\ndescriptoin: typo\n---\n\n# demo\n",
			errors: [
				{ messageId: "unknownKey", data: { key: "descriptoin" }, line: 3 },
			],
		},
	],
});
