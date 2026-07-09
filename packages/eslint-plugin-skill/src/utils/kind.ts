/**
 * Skill KIND: a taxonomy for applying different lint expectations to
 * different shapes of skill.
 *
 * Grounded in official Claude Code guidance, which distinguishes "Reference
 * content" (inline domain knowledge) from "Task content" (step-by-step
 * actions, often gated with `disable-model-invocation`), plus the
 * `skill-creator` meta-skill's multi-domain/variant pattern
 * (`references/{aws,gcp,azure}.md`). `tool-wrapper` and `meta` are defensible
 * extensions, not explicitly named in any single source — see
 * docs/design/skill-taxonomy-and-rules.md.
 *
 * A skill may declare its kind explicitly via `metadata.kind` in frontmatter;
 * this is the only signal the lint rules act on, since heuristic detection is
 * inherently fuzzy and a wrong guess should never cause a false positive.
 * `detectKind` is exposed separately as an informative, best-effort signal —
 * it never gates a rule.
 */

export const SKILL_KINDS = [
	"procedural",
	"reference",
	"multi-domain",
	"tool-wrapper",
	"meta",
] as const;

export type SkillKind = (typeof SKILL_KINDS)[number];

function isSkillKind(value: unknown): value is SkillKind {
	return (
		typeof value === "string" && (SKILL_KINDS as readonly string[]).includes(value)
	);
}

/**
 * The skill's explicitly declared kind, via `metadata.kind` in frontmatter.
 * Returns `undefined` when absent, malformed, or not a recognized kind.
 */
export function declaredKind(
	data: Record<string, unknown> | null | undefined,
): SkillKind | undefined {
	const metadata = data?.metadata;
	if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
		return undefined;
	}
	const kind = (metadata as Record<string, unknown>).kind;
	return isSkillKind(kind) ? kind : undefined;
}

export interface DetectKindInput {
	data: Record<string, unknown> | null | undefined;
	/** Number of ordered/numbered lists found in the body. */
	orderedListCount: number;
	/** Number of `.md` files under the skill's `references/` directory. */
	referenceFileCount: number;
	/** Whether the body links to another skill (the `[[skill-name]]` convention). */
	linksToOtherSkills: boolean;
}

/**
 * Best-effort auto-detected kind from observable signals, for tooling and
 * documentation purposes. This is advisory only — no rule fails or warns
 * based on a guess, only on an explicit `metadata.kind` declaration.
 */
export function detectKind(input: DetectKindInput): SkillKind | undefined {
	const declared = declaredKind(input.data);
	if (declared) {
		return declared;
	}

	const allowedTools = input.data?.["allowed-tools"];
	const hasAllowedTools = Array.isArray(allowedTools) && allowedTools.length > 0;
	const disableModelInvocation = input.data?.["disable-model-invocation"] === true;

	const scores: Record<SkillKind, number> = {
		meta: input.linksToOtherSkills ? 2 : 0,
		"tool-wrapper": hasAllowedTools ? 2 : 0,
		procedural:
			(disableModelInvocation ? 2 : 0) + (input.orderedListCount >= 1 ? 1 : 0),
		// >= 2 reference files is the more specific "multi-domain" signal; it
		// must outscore the generic "reference" signal so a tie resolves to it.
		"multi-domain": input.referenceFileCount >= 2 ? 2 : 0,
		reference: input.referenceFileCount >= 1 ? 1 : 0,
	};

	let best: SkillKind | undefined;
	let bestScore = 0;
	for (const kind of SKILL_KINDS) {
		if (scores[kind] > bestScore) {
			best = kind;
			bestScore = scores[kind];
		}
	}
	return best;
}
