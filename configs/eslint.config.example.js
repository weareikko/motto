// Drop-in ESLint flat config for a repository of Claude Code skills.
//
// Copy this to `eslint.config.js` at the root of your skills repo, then run:
//
//   npx eslint "**/SKILL.md"
//
// The `recommended` preset already targets `**​/SKILL.md`, loads the markdown
// language with YAML frontmatter, and enables the rule set. Swap it for
// `motto.configs.strict` to fail CI on quality warnings too.

import motto from "eslint-plugin-motto";

export default [
	motto.configs.recommended,

	// Example override: raise a cap or silence a rule for your house style.
	// {
	// 	files: ["**/SKILL.md"],
	// 	rules: {
	// 		"motto/body-max-length": ["warn", { maxLines: 400 }],
	// 	},
	// },
];
