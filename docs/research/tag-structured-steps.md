# Should procedural skill steps use `<steps><step>` tags instead of markdown ordered lists?

**Verdict: don't adopt.** No measured comprehension benefit; a real, quantified token cost.

## Question

A skill declared `metadata.kind: procedural` needs clearly bounded, sequential steps. Today `procedural-has-steps` checks for a markdown ordered list. Proposal under test: would wrapping steps in explicit tags (`<steps><step>...</step></steps>`) produce more reliable comprehension — especially for steps containing nested content (sub-lists, code blocks) where a plain ordered list might be ambiguous — and would that be worth the format's cost?

## Evidence

### 1. Documented guidance

Anthropic's current prompt-engineering guide ([platform.claude.com — prompt engineering](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering)) is direct and on-point:

> "Provide instructions as sequential steps using numbered lists or bullet points when the order or completeness of steps matters."

XML tags are recommended by the same guide, but for a **different** problem — separating heterogeneous content types in a complex prompt, not sequencing steps within one procedure:

> "XML tags help Claude parse complex prompts unambiguously, especially when your prompt mixes instructions, context, examples, and variable inputs."

So the officially documented mechanism for exactly this use case (steps where order/completeness matters) is already a plain numbered list — which is what `procedural-has-steps` already checks for.

### 2. Empirical comprehension test

Two adversarial procedure bodies were written — the kind of realistic complexity where a plain list plausibly *could* lose clarity:

- **Nested-list case**: a top-level step containing its own nested numbered sub-list (numbering restarts inside the step).
- **Code-fence case**: a top-level step containing a fenced code block with numbered-looking lines (`1) stop service`, `2) checkout tag`...) that are not a markdown list at all.

Each was authored in both formats (plain ordered list vs. `<steps><step>`) and given to **12 fresh, isolated agent instances** (3 trials × 2 cases × 2 formats, no shared context, no knowledge this was a comparison) with the task: report the top-level step count and a short label per step.

**Result: 12/12 correct**, both formats, both cases. Every trial correctly identified 5 steps (nested-list case) or 4 steps (code-fence case) and did not confuse nested/embedded numbering with top-level step boundaries — regardless of format.

### 3. Token cost

Measured with `@anthropic-ai/tokenizer` on the same two test bodies:

| Case | Markdown list | `<steps><step>` | Overhead |
| --- | --- | --- | --- |
| Nested-list | 84 tokens | 110 tokens | **+26 tokens (+31.0%)** |
| Code-fence | 92 tokens | 113 tokens | **+21 tokens (+22.8%)** |

Since a loaded skill body stays in context for the rest of the conversation, this overhead is paid on every remaining turn, not just once.

## Verdict

**Don't adopt.** The proposal aimed to fix a hypothesized ambiguity that the empirical test did not find — Claude parsed both adversarial cases perfectly in both formats — while carrying a real, measured, non-trivial token cost (~23–31% more expensive for the exact content tested) and going against Anthropic's own documented recommendation for this use case.

## Resulting rule

None. `procedural-has-steps` (checks for a markdown ordered list) is already the evidence-backed convention and is unchanged by this investigation.

## Caveats / what wasn't tested

- Test procedures were short (4–5 steps). It's untested whether much longer or more deeply nested procedures (e.g. 20+ steps, multiple levels of nesting) shift this result — that would be a new, separate investigation, not an assumption to carry over.
- The grading was step-count + short-label accuracy, not full end-to-end task execution fidelity (i.e., we tested "can the agent identify the steps," not "does the agent execute them correctly downstream"). A future test could measure execution fidelity directly.
