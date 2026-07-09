import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import rule from "../../src/rules/no-orphan-references";
import { makeRuleTester, skill } from "../setup";

const here = dirname(fileURLToPath(import.meta.url));
const F = join(here, "..", "fixtures", "orphan-skill", "SKILL.md");

const ruleTester = makeRuleTester();

ruleTester.run("no-orphan-references", rule, {
	valid: [
		// Links both reference files → nothing orphaned.
		{
			filename: F,
			code: skill({
				name: "orphan-skill",
				body: "# orphan-skill\n\n[a](references/linked.md) [b](references/orphan.md)\n",
			}),
		},
	],
	invalid: [
		// Only links linked.md → orphan.md is flagged.
		{
			filename: F,
			code: skill({
				name: "orphan-skill",
				body: "# orphan-skill\n\n[a](references/linked.md)\n",
			}),
			errors: [
				{ messageId: "orphan", data: { file: "references/orphan.md" } },
			],
		},
	],
});
