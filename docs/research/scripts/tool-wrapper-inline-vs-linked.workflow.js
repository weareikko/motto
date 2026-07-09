// Reproduction script for docs/research/tool-wrapper-inline-vs-linked-flags.md.
//
// Run with:
//   Workflow({ scriptPath: 'docs/research/scripts/tool-wrapper-inline-vs-linked.workflow.js' })
//
// IMPORTANT: Workflow scripts have no filesystem access, so INLINE_PATH and
// LINKED_PATH below must be absolute paths on the machine running the
// workflow. Point them at your checkout of:
//   docs/research/fixtures/tool-wrapper-inline-vs-linked/inline/SKILL.md
//   docs/research/fixtures/tool-wrapper-inline-vs-linked/linked/SKILL.md
// (the linked SKILL.md links to ./references/flags.md relative to itself,
// which is already checked in alongside it).
//
// This is the CORRECTED version — see docs/research/tool-wrapper-inline-vs-linked-flags.md
// for the two bugs found in the original run and fixed here:
//   1. Fixture paths are hardcoded constants (not passed via Workflow `args`,
//      which arrived as a stringified value in the original run, making every
//      trial silently read from the literal path "undefined").
//   2. grade() requires an explicit conflict acknowledgement before treating
//      the presence of both flag names as a real miss — the original naive
//      version flagged "--compress ... --verify ..." as a miss even when the
//      response correctly explained the conflict and offered two safe
//      single-flag alternatives (which necessarily mentions both flag names).

export const meta = {
	name: 'tool-wrapper-inline-vs-linked',
	description: 'N-trial x 3-model blind trial: inline vs linked flag reference for a tool-wrapper skill',
	phases: [{ title: 'Trials', detail: 'inline vs linked x haiku/sonnet/opus, N each' }],
}

// EDIT THESE two constants to your checkout's absolute paths before running.
const INLINE_PATH = '/absolute/path/to/docs/research/fixtures/tool-wrapper-inline-vs-linked/inline/SKILL.md'
const LINKED_PATH = '/absolute/path/to/docs/research/fixtures/tool-wrapper-inline-vs-linked/linked/SKILL.md'

const CONDITIONS = [
	{ key: 'inline', path: INLINE_PATH },
	{ key: 'linked', path: LINKED_PATH },
]
const MODELS = ['haiku', 'sonnet', 'opus']
const N = 20 // original run; reduce for a cheaper smoke test

const SCHEMA = {
	type: 'object',
	properties: {
		command: { type: 'string' },
		consultedReferenceFile: { type: 'boolean' },
	},
	required: ['command', 'consultedReferenceFile'],
}

function makePrompt(path) {
	return `A skill file describing a CLI wrapper is available at the absolute path: ${path}\n\nUse the Read tool to open that exact path (and follow any relative links it contains to reference files, reading those too if needed) before answering. Then give the exact \`snapctl create\` command for this request: "Create a compressed, tagged snapshot of /data using gzip, verify its integrity afterward, retaining the 5 most recent snapshots." Report only the command and whether you opened a separate reference file to answer.`
}

phase('Trials')
log(`Fixture paths — inline: ${INLINE_PATH} | linked: ${LINKED_PATH}`)

const jobs = []
for (const model of MODELS) {
	for (const cond of CONDITIONS) {
		for (let i = 0; i < N; i++) {
			jobs.push({ model, cond, i })
		}
	}
}

log(`Launching ${jobs.length} trials (${MODELS.length} models x ${CONDITIONS.length} conditions x ${N} each)`)

const results = await parallel(jobs.map(job => async () => {
	const result = await agent(makePrompt(job.cond.path), {
		schema: SCHEMA,
		model: job.model,
		agentType: 'general-purpose',
		label: `${job.model}:${job.cond.key}:${job.i + 1}`,
		phase: 'Trials',
	})
	if (!result) return null
	return { model: job.model, condition: job.cond.key, ...result }
}))

const clean = results.filter(Boolean)

// Corrected grader (bug 2 fix): only a genuine miss if the response presents
// a single command combining both flags WITHOUT acknowledging the conflict.
// A response that explains the conflict and offers two safe alternatives
// necessarily mentions both flag names too — that must not be scored as a
// miss. See the write-up for the full audit that motivated this fix.
const CONFLICT_LANGUAGE = /(mutually exclusive|cannot be combined|cannot combine|cannot use both|conflict|invalid|incompatible|not supported on compressed|drop (one|either)|choose (one|either)|option 1|closest.*alternat)/i

function classify(command) {
	if (!command || !/snapctl create/i.test(command)) return 'invalid_no_command'
	const hasCompress = /--compress\b/.test(command)
	const hasVerify = /--verify\b/.test(command)
	const flagged = CONFLICT_LANGUAGE.test(command)
	if (hasCompress && hasVerify) return flagged ? 'flagged_with_alternatives' : 'genuine_miss'
	if (hasCompress || hasVerify) return flagged ? 'flagged_single_flag_with_caveat' : 'silent_single_flag_no_caveat'
	return 'invalid_no_flags'
}

const graded = clean.map(r => ({ ...r, classification: classify(r.command) }))

const summary = {}
for (const model of MODELS) {
	for (const cond of CONDITIONS) {
		const bucket = graded.filter(g => g.model === model && g.condition === cond.key)
		const counts = {}
		for (const g of bucket) counts[g.classification] = (counts[g.classification] || 0) + 1
		const genuineMisses = counts.genuine_miss || 0
		const consulted = bucket.filter(g => g.consultedReferenceFile).length
		summary[`${model}:${cond.key}`] = {
			n: bucket.length,
			correctness: bucket.length ? Math.round(((bucket.length - genuineMisses) / bucket.length) * 1000) / 1000 : null,
			classificationCounts: counts,
			consultedReferenceFile: consulted,
		}
	}
}

log('Summary: ' + JSON.stringify(summary))
return { summary, raw: graded, expectedN: jobs.length, actualN: clean.length }
