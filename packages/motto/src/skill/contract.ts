/**
 * Derive a testable *contract* from a skill's `description`.
 *
 * A Claude Code skill's frontmatter `description` is the only machine-readable
 * promise it makes: it states (a) *what* the skill does — the capability claim —
 * and usually (b) *when* to use it — the trigger cues. `motto`'s wedge is that
 * this contract is free: we don't need the author to write eval cases, we read
 * the ones they already committed to.
 *
 * This MVP derivation is fully deterministic (no model, no spend): it splits the
 * description at a trigger marker into a `claim` and a set of `triggers`, then
 * templates a positive prompt per trigger. Deterministic templating is crude —
 * the prompts read mechanically — but it is honest and reproducible. A future
 * `--generate` flag will use a model to phrase natural prompts and synthesize
 * adjacent-but-out-of-scope negatives, which templating cannot do well.
 */

export interface SkillContract {
	/** The capability clause: what the skill claims to do. */
	claim: string;
	/** Trigger cue phrases extracted from the description. */
	triggers: string[];
	/** Templated user prompts that SHOULD make the skill fire. */
	positivePrompts: string[];
	/** True when a trigger marker ("Use when …") was found in the description. */
	hasTriggerCue: boolean;
}

/**
 * Trigger markers, longest-first so "use this skill when" wins over "use when".
 * Matched case-insensitively at a word boundary.
 */
const TRIGGER_MARKERS = [
	"use this skill when",
	"use this skill for",
	"use this when",
	"use this for",
	"useful when",
	"useful for",
	"invoke when",
	"trigger when",
	"apply when",
	"use when",
	"use for",
	"when the user",
	"when you need to",
	"when asked to",
];

/** Find the earliest trigger marker in the description. */
function findMarker(
	description: string,
): { index: number; length: number } | null {
	const lower = description.toLowerCase();
	let best: { index: number; length: number } | null = null;
	for (const marker of TRIGGER_MARKERS) {
		const idx = lower.indexOf(marker);
		if (idx === -1) continue;
		// Keep the earliest match; on a tie, the longer marker.
		if (
			!best ||
			idx < best.index ||
			(idx === best.index && marker.length > best.length)
		) {
			best = { index: idx, length: marker.length };
		}
	}
	return best;
}

/** Split a trigger clause into individual cue phrases. */
function splitTriggers(clause: string): string[] {
	return clause
		.split(/[;.]|\n|,\s+or\s+|\s+or\s+|,\s+and\s+|\s+and\s+|,/i)
		.map((s) =>
			s
				.replace(/^\s*(?:to|the|a|an)\s+/i, "")
				.replace(/[.:;,\s]+$/, "")
				.trim(),
		)
		.filter((s) => s.length >= 3);
}

/**
 * Template a positive user prompt from a trigger cue phrase. Deterministic and
 * intentionally plain — flagged as templated, not model-authored.
 */
function templatePrompt(trigger: string): string {
	const t = trigger.replace(/\s+/g, " ").trim();
	return `I need help with the following: ${t}.`;
}

/** Derive the contract from a description string. */
export function deriveContract(description: string): SkillContract {
	const desc = (description ?? "").trim();
	const marker = findMarker(desc);

	if (!marker) {
		// No explicit trigger cue: the whole description is the claim, and the
		// single positive prompt restates it. Trigger fidelity is weak here —
		// the report should note the description has no "use when" cue.
		const claim = desc;
		return {
			claim,
			triggers: [],
			positivePrompts: claim ? [templatePrompt(claim)] : [],
			hasTriggerCue: false,
		};
	}

	const claim = desc.slice(0, marker.index).replace(/[.\s]+$/, "").trim();
	const triggerClause = desc.slice(marker.index + marker.length).trim();
	const triggers = splitTriggers(triggerClause);

	return {
		claim,
		triggers,
		positivePrompts: triggers.map(templatePrompt),
		hasTriggerCue: true,
	};
}
