import rule from "../../src/rules/procedural-has-steps";
import { makeRuleTester } from "../setup";

const F = "skills/demo/SKILL.md";
const ruleTester = makeRuleTester();

const withKind = (kind: string, body: string) =>
	`---\nname: demo\ndescription: x\nmetadata:\n  kind: ${kind}\n---\n\n${body}`;

ruleTester.run("procedural-has-steps", rule, {
	valid: [
		// Not declared procedural — rule stays silent regardless of body shape.
		{ filename: F, code: "---\nname: demo\ndescription: x\n---\n\n# demo\n\nNo steps.\n" },
		{
			filename: F,
			code: withKind("procedural", "# demo\n\n1. First.\n2. Second.\n"),
		},
	],
	invalid: [
		{
			filename: F,
			code: withKind("procedural", "# demo\n\nJust prose, no steps.\n"),
			errors: [{ messageId: "noSteps" }],
		},
		{
			filename: F,
			// A bullet list is not an ORDERED list.
			code: withKind("procedural", "# demo\n\n- First.\n- Second.\n"),
			errors: [{ messageId: "noSteps" }],
		},
	],
});
