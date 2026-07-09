import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import rule from "../../src/rules/no-broken-relative-links";
import { makeRuleTester, skill } from "../setup";

// Point at a real fixture directory so on-disk existence checks resolve.
// tests/fixtures/good-skill/ contains a real `reference.md`.
const here = dirname(fileURLToPath(import.meta.url));
const F = join(here, "..", "fixtures", "good-skill", "SKILL.md");

const ruleTester = makeRuleTester();

ruleTester.run("no-broken-relative-links", rule, {
	valid: [
		{
			filename: F,
			code: skill({
				body: "# good-skill\n\nSee [ref](./reference.md) and [anchor](#steps).\n",
			}),
		},
		{
			filename: F,
			code: skill({
				body: "# good-skill\n\n[site](https://example.com) [mail](mailto:x@y.z).\n",
			}),
		},
		{
			filename: F,
			code: skill({ body: "# good-skill\n\n[ref](./reference.md#top).\n" }),
		},
	],
	invalid: [
		{
			filename: F,
			code: skill({ body: "# good-skill\n\nSee [gone](./nope.md).\n" }),
			errors: [
				{ messageId: "broken", data: { kind: "link", url: "./nope.md" } },
			],
		},
		{
			filename: F,
			code: skill({ body: "# good-skill\n\n![img](./missing.png)\n" }),
			errors: [
				{
					messageId: "broken",
					data: { kind: "image", url: "./missing.png" },
				},
			],
		},
	],
});
