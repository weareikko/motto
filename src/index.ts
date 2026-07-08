/**
 * @ikko-dev/eslint-plugin-skill — lint Claude Code Agent Skills (`SKILL.md`).
 *
 * The plugin exposes a set of rules plus two ready-to-use flat configs. Each
 * config is self-contained: it targets `**​/SKILL.md`, wires up the
 * `@eslint/markdown` language with YAML frontmatter, and turns on the rules.
 */

import markdown from "@eslint/markdown";
import type { ESLint, Linter } from "eslint";

import requireFrontmatter from "./rules/require-frontmatter";
import nameKebabCase from "./rules/name-kebab-case";
import nameMatchesDir from "./rules/name-matches-dir";
import descriptionLength from "./rules/description-length";
import descriptionHasTrigger from "./rules/description-has-trigger";
import descriptionNoHtml from "./rules/description-no-html";
import noMultipleH1 from "./rules/no-multiple-h1";
import h1MatchesName from "./rules/h1-matches-name";
import bodyMaxLength from "./rules/body-max-length";
import noBrokenRelativeLinks from "./rules/no-broken-relative-links";
import noUnknownFrontmatterKeys from "./rules/no-unknown-frontmatter-keys";
import refsOneLevelDeep from "./rules/refs-one-level-deep";
import noOrphanReferences from "./rules/no-orphan-references";
import descriptiveReferenceFilenames from "./rules/descriptive-reference-filenames";
import largeReferenceToc from "./rules/large-reference-toc";
import validAllowedTools from "./rules/valid-allowed-tools";
import proceduralHasSteps from "./rules/procedural-has-steps";
import referenceHasContent from "./rules/reference-has-content";
import multiDomainHasVariants from "./rules/multi-domain-has-variants";

const plugin = {
	meta: {
		name: __PKG_NAME__,
		version: __PKG_VERSION__,
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
		"no-unknown-frontmatter-keys": noUnknownFrontmatterKeys,
		"refs-one-level-deep": refsOneLevelDeep,
		"no-orphan-references": noOrphanReferences,
		"descriptive-reference-filenames": descriptiveReferenceFilenames,
		"large-reference-toc": largeReferenceToc,
		"valid-allowed-tools": validAllowedTools,
		"procedural-has-steps": proceduralHasSteps,
		"reference-has-content": referenceHasContent,
		"multi-domain-has-variants": multiDomainHasVariants,
	},
	configs: {} as Record<string, Linter.Config>,
} satisfies ESLint.Plugin;

/**
 * Rule severities for the `recommended` preset. `warn` marks quality signals
 * that shouldn't necessarily fail CI; `strict` promotes them to `error`.
 */
const RECOMMENDED_RULES: Linter.RulesRecord = {
	"skill/require-frontmatter": "error",
	"skill/name-kebab-case": "error",
	"skill/name-matches-dir": "error",
	"skill/description-length": "error",
	"skill/description-no-html": "error",
	"skill/no-multiple-h1": "error",
	"skill/no-broken-relative-links": "error",
	"skill/no-unknown-frontmatter-keys": "error",
	"skill/refs-one-level-deep": "error",
	"skill/valid-allowed-tools": "error",
	"skill/description-has-trigger": "warn",
	"skill/body-max-length": "warn",
	"skill/no-orphan-references": "warn",
	"skill/descriptive-reference-filenames": "warn",
	"skill/large-reference-toc": "warn",
	// `h1-matches-name` is intentionally omitted: the standard skill format does
	// not require an H1, and the frontmatter `name` is a display label, not the
	// body title. Teams that adopt the "H1 mirrors name" convention can opt in.
};

const STRICT_RULES: Linter.RulesRecord = Object.fromEntries(
	Object.keys(RECOMMENDED_RULES).map((id) => [id, "error"]),
);

function makeConfig(name: string, rules: Linter.RulesRecord): Linter.Config {
	return {
		name,
		files: ["**/SKILL.md", "**/references/**/*.md"],
		plugins: { markdown, skill: plugin },
		language: "markdown/gfm",
		languageOptions: { frontmatter: "yaml" },
		rules,
	};
}

plugin.configs.recommended = makeConfig("skill/recommended", RECOMMENDED_RULES);
plugin.configs.strict = makeConfig("skill/strict", STRICT_RULES);

export default plugin;
