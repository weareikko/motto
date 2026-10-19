// Drop-in ESLint flat config for a repository of Claude Code skills.
//
// Copy this to `eslint.config.js` at the root of your skills repo, then run:
//
//   npx eslint "**/SKILL.md"
//
// The `recommended` preset already targets `**​/SKILL.md`, loads the markdown
// language with YAML frontmatter, and enables the rule set. Swap it for
// `skill.configs.strict` to fail CI on quality warnings too.

import skill from "@weareikko/eslint-plugin-skill";

export default [
	skill.configs.recommended,

	// Example override: raise a cap or silence a rule for your house style.
	// {
	// 	files: ["**/SKILL.md"],
	// 	rules: {
	// 		"skill/body-max-length": ["warn", { maxLines: 400 }],
	// 	},
	// },
];
