import rule from "../../src/rules/large-reference-toc";
import { makeRuleTester } from "../setup";

const ruleTester = makeRuleTester();
const R = "skills/demo/references/big.md";

const filler = Array(320).fill("A line of content.").join("\n");
const bigNoToc = `# Big reference\n\n${filler}\n`;
const bigWithHeading = `# Big reference\n\n## Contents\n\n${filler}\n`;
const bigWithAnchors = `# Big reference\n\n- [One](#one)\n- [Two](#two)\n- [Three](#three)\n\n${filler}\n`;

ruleTester.run("large-reference-toc", rule, {
	valid: [
		// Small reference file — no TOC needed.
		{ filename: R, code: "# Small\n\nShort.\n" },
		// Large but has a Contents heading.
		{ filename: R, code: bigWithHeading },
		// Large but has a cluster of anchor links.
		{ filename: R, code: bigWithAnchors },
		// Large file that isn't a reference file → ignored.
		{ filename: "skills/demo/SKILL.md", code: bigNoToc },
	],
	invalid: [
		{
			filename: R,
			code: bigNoToc,
			errors: [{ messageId: "missingToc" }],
		},
	],
});
