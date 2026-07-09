import rule from "../../src/rules/descriptive-reference-filenames";
import { makeRuleTester } from "../setup";

const ruleTester = makeRuleTester();
const body = "# Reference\n\nContent.\n";

ruleTester.run("descriptive-reference-filenames", rule, {
	valid: [
		{ filename: "skills/demo/references/form_validation_rules.md", code: body },
		{ filename: "skills/demo/references/ga4-setup.md", code: body },
		// Not a reference file → ignored.
		{ filename: "skills/demo/SKILL.md", code: body },
	],
	invalid: [
		{
			filename: "skills/demo/references/doc2.md",
			code: body,
			errors: [{ messageId: "generic", data: { name: "doc2.md" } }],
		},
		{
			filename: "skills/demo/references/untitled.md",
			code: body,
			errors: [{ messageId: "generic", data: { name: "untitled.md" } }],
		},
		{
			filename: "skills/demo/references/1.md",
			code: body,
			errors: [{ messageId: "generic", data: { name: "1.md" } }],
		},
	],
});
