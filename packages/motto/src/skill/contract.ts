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
 * Trigger markers that introduce a "when to use" clause. Matched
 * case-insensitively and only at a sentence boundary (start of string or after
 * `.!?…:;`), so a mid-claim "…a tool to use to…" cannot false-match a "use to"
 * marker. English and French are both covered — the target corpus (a French
 * studio's skills) writes cues as "À utiliser quand …" / "Déclencher quand …".
 */
const TRIGGER_MARKERS = [
	// English
	"use this skill when",
	"use this skill for",
	"use this when",
	"use this for",
	"use when",
	"use for",
	"use to",
	"use before",
	"use after",
	"useful when",
	"useful for",
	"invoke when",
	"trigger when",
	"apply when",
	"when the user",
	"when you need to",
	"when asked to",
	// French
	"à utiliser quand",
	"à utiliser lorsque",
	"à utiliser pour",
	"utiliser quand",
	"utiliser lorsque",
	"utiliser pour",
	"à déclencher quand",
	"déclencher quand",
	"déclencher lorsque",
	"à appeler quand",
	"utile quand",
	"utile pour",
	"quand l'utilisateur",
	"lorsque l'utilisateur",
];

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Sentence terminators used to bound the trigger clause. */
const SENTENCE_END = /[.!?…]\s|[.!?…]$/;

/**
 * Find the earliest trigger marker that begins a sentence. Anchoring to a
 * boundary avoids matching a marker substring inside the capability claim.
 */
function findMarker(
	description: string,
): { index: number; length: number } | null {
	const lower = description.toLowerCase();
	let best: { index: number; length: number } | null = null;
	for (const marker of TRIGGER_MARKERS) {
		const re = new RegExp(
			`(?:^|[.!?…:;\\n]\\s*)${escapeRegExp(marker)}`,
			"g",
		);
		const m = re.exec(lower);
		if (!m) continue;
		const index = m.index + m[0].length - marker.length; // start of the marker
		if (
			!best ||
			index < best.index ||
			(index === best.index && marker.length > best.length)
		) {
			best = { index, length: marker.length };
		}
	}
	return best;
}

/** The trigger clause runs from the marker to the end of its sentence. */
function triggerClause(description: string, markerEnd: number): string {
	const rest = description.slice(markerEnd);
	const end = rest.search(SENTENCE_END);
	return (end === -1 ? rest : rest.slice(0, end + 1)).trim();
}

/** Split a trigger clause into individual cue phrases (English + French). */
function splitTriggers(clause: string): string[] {
	return clause
		.split(
			/[;.]|\n|,\s+(?:or|and|ou|et)\s+|\s+(?:or|and|ou|et)\s+|,/i,
		)
		.map((s) =>
			s
				.replace(/^\s*(?:to|the|a|an|de|des|du|le|la|les|un|une|d')\s+/i, "")
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
	const clause = triggerClause(desc, marker.index + marker.length);
	const triggers = splitTriggers(clause);

	return {
		claim,
		triggers,
		positivePrompts: triggers.map(templatePrompt),
		hasTriggerCue: true,
	};
}
