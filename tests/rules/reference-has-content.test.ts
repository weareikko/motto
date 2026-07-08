import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import rule from "../../src/rules/reference-has-content";
import { makeRuleTester } from "../setup";

const here = dirname(fileURLToPath(import.meta.url));
const populated = join(here, "..", "fixtures", "kind-reference-populated", "SKILL.md");
const empty = join(here, "..", "fixtures", "kind-reference-empty", "SKILL.md");

const declareReference =
	"---\nname: demo\ndescription: x\nmetadata:\n  kind: reference\n---\n\n# demo\n";
const notDeclared = "---\nname: demo\ndescription: x\n---\n\n# demo\n";

const ruleTester = makeRuleTester();

ruleTester.run("reference-has-content", rule, {
	valid: [
		// Not declared reference — stays silent even with no references/ dir.
		{ filename: empty, code: notDeclared },
		// Declared reference AND has reference files on disk.
		{ filename: populated, code: declareReference },
	],
	invalid: [
		// Declared reference but no references/ directory exists.
		{
			filename: empty,
			code: declareReference,
			errors: [{ messageId: "noReferences" }],
		},
	],
});
