/**
 * eslint-plugin-motto — lint Claude Code Agent Skills (`SKILL.md`).
 *
 * The plugin exposes a set of rules plus two ready-to-use flat configs. Each
 * config is self-contained: it targets `**​/SKILL.md`, wires up the
 * `@eslint/markdown` language with YAML frontmatter, and turns on the rules.
 */

import markdown from "@eslint/markdown";

import requireFrontmatter from "./rules/require-frontmatter.js";
import nameKebabCase from "./rules/name-kebab-case.js";
import nameMatchesDir from "./rules/name-matches-dir.js";
import descriptionLength from "./rules/description-length.js";
import descriptionHasTrigger from "./rules/description-has-trigger.js";
import descriptionNoHtml from "./rules/description-no-html.js";
import noMultipleH1 from "./rules/no-multiple-h1.js";
import h1MatchesName from "./rules/h1-matches-name.js";
import bodyMaxLength from "./rules/body-max-length.js";
import noBrokenRelativeLinks from "./rules/no-broken-relative-links.js";

const version = "0.1.0";

/** @type {import("eslint").ESLint.Plugin} */
const plugin = {
	meta: {
		name: "eslint-plugin-motto",
		version,
	},
	rules: {
		"require-frontmatter": requireFrontmatter,
		"name-kebab-case": nameKebabCase,
		"name-matches-dir": nameMatchesDir,
		"description-length": descriptionLength,
		"description-has-trigger": descriptionHasTrigger,
		"description-no-html": descriptionNoHtml,
		"no-multiple-h1": noMultipleH1,
		"h1-matches-name": h1MatchesName,
		"body-max-length": bodyMaxLength,
		"no-broken-relative-links": noBrokenRelativeLinks,
	},
};

/**
 * Rule severities for the `recommended` preset. `warn` marks quality signals
 * that shouldn't necessarily fail CI; `strict` promotes them to `error`.
 */
const RECOMMENDED_RULES = {
	"motto/require-frontmatter": "error",
	"motto/name-kebab-case": "error",
	"motto/name-matches-dir": "error",
	"motto/description-length": "error",
	"motto/description-no-html": "error",
	"motto/no-multiple-h1": "error",
	"motto/no-broken-relative-links": "error",
	"motto/description-has-trigger": "warn",
	"motto/body-max-length": "warn",
	// `h1-matches-name` is intentionally omitted: the standard skill format does
	// not require an H1, and the frontmatter `name` is a display label, not the
	// body title. Teams that adopt the "H1 mirrors name" convention can opt in.
};

const STRICT_RULES = Object.fromEntries(
	Object.keys(RECOMMENDED_RULES).map(id => [id, "error"]),
);

/**
 * @param {string} name
 * @param {Record<string, unknown>} rules
 * @returns {import("eslint").Linter.Config}
 */
function makeConfig(name, rules) {
	return {
		name,
		files: ["**/SKILL.md"],
		plugins: { markdown, motto: plugin },
		language: "markdown/gfm",
		languageOptions: { frontmatter: "yaml" },
		rules,
	};
}

plugin.configs = {
	recommended: makeConfig("motto/recommended", RECOMMENDED_RULES),
	strict: makeConfig("motto/strict", STRICT_RULES),
};

export default plugin;
