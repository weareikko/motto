import rule from "../../src/rules/meta-prefers-dispatch-table";
import { makeRuleTester } from "../setup";

const F = "skills/demo/SKILL.md";
const ruleTester = makeRuleTester();

const declareMeta = (body: string) =>
	`---\nname: demo\ndescription: x\nmetadata:\n  kind: meta\n---\n\n${body}`;
const notDeclared = (body: string) => `---\nname: demo\ndescription: x\n---\n\n${body}`;

const tableBody = `# demo

| Skill | Handles |
| --- | --- |
| a | Does A. |
| b | Does B. |
`;

const proseBody = `# demo

The a skill does A. The b skill does B.
`;

ruleTester.run("meta-prefers-dispatch-table", rule, {
	valid: [
		// Not declared meta — stays silent regardless of body shape.
		{ filename: F, code: notDeclared(proseBody) },
		// Declared meta AND already has a table.
		{ filename: F, code: declareMeta(tableBody) },
	],
	invalid: [
		{
			filename: F,
			code: declareMeta(proseBody),
			errors: [{ messageId: "preferTable" }],
		},
	],
});
