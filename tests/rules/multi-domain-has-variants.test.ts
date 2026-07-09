import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import rule from "../../src/rules/multi-domain-has-variants";
import { makeRuleTester } from "../setup";

const here = dirname(fileURLToPath(import.meta.url));
const twoVariants = join(here, "..", "fixtures", "kind-multi-domain-two", "SKILL.md");
const oneVariant = join(here, "..", "fixtures", "kind-multi-domain-one", "SKILL.md");
const noVariants = join(here, "..", "fixtures", "kind-multi-domain-none", "SKILL.md");

const declareMultiDomain =
	"---\nname: demo\ndescription: x\nmetadata:\n  kind: multi-domain\n---\n\n# demo\n";
const notDeclared = "---\nname: demo\ndescription: x\n---\n\n# demo\n";

const ruleTester = makeRuleTester();

ruleTester.run("multi-domain-has-variants", rule, {
	valid: [
		// Not declared multi-domain — stays silent regardless of variant count.
		{ filename: oneVariant, code: notDeclared },
		// Declared multi-domain AND has >= 2 reference files.
		{ filename: twoVariants, code: declareMultiDomain },
	],
	invalid: [
		{
			filename: oneVariant,
			code: declareMultiDomain,
			errors: [{ messageId: "tooFewVariants", data: { min: 2 } }],
		},
		{
			filename: noVariants,
			code: declareMultiDomain,
			errors: [{ messageId: "tooFewVariants", data: { min: 2 } }],
		},
	],
});
