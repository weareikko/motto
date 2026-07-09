// Reproduction script for docs/research/tool-wrapper-examples.md (backlog #9).
// Does providing worked examples IN-BODY (always loaded) vs LINKED (loaded on
// demand) change first-attempt task success for a tool-wrapper skill?
//
// Run: Workflow({ scriptPath: 'docs/research/scripts/tool-wrapper-examples.workflow.js' })
// Workflow scripts have no filesystem access — edit the two PATH constants to
// your checkout's absolute paths first:
//   docs/research/fixtures/tool-wrapper-examples/inline/SKILL.md
//   docs/research/fixtures/tool-wrapper-examples/linked/SKILL.md

export const meta = {
	name: 'tool-wrapper-examples',
	description: 'N=20 x 3-tier: in-body vs linked worked examples for a tool-wrapper; first-attempt correctness on a task whose correct syntax lives only in the examples',
	phases: [{ title: 'Trials', detail: 'inline vs linked x haiku/sonnet/opus x N=20' }],
}

const INLINE_PATH = '/absolute/path/to/docs/research/fixtures/tool-wrapper-examples/inline/SKILL.md'
const LINKED_PATH = '/absolute/path/to/docs/research/fixtures/tool-wrapper-examples/linked/SKILL.md'

const CONDITIONS = [
	{ key: 'inline', path: INLINE_PATH },
	{ key: 'linked', path: LINKED_PATH },
]
const MODELS = ['haiku', 'sonnet', 'opus']
const N = 20

const SCHEMA = {
	type: 'object',
	properties: {
		command: { type: 'string' },
		openedExamplesFile: { type: 'boolean' },
	},
	required: ['command', 'openedExamplesFile'],
}

// The task requires the non-obvious flags shown only in the examples:
//   dbsync copy production.orders staging --mask email,phone --plan
// An agent that skips the examples and guesses will likely use --exclude
// and/or --dry-run (which the body explicitly says dbsync does NOT use).
function makePrompt(path) {
	return `A tool-wrapper skill is available at the absolute path: ${path}\n\nRead it (and any file it links to, if needed) before answering. Give the exact single \`dbsync\` command for this request: "Copy the production.orders table to staging, masking the email and phone columns, and preview it without executing." Report only the command and whether you opened a separate examples file to answer.`
}

phase('Trials')

const jobs = []
for (const model of MODELS) {
	for (const cond of CONDITIONS) {
		for (let i = 0; i < N; i++) jobs.push({ model, cond, i })
	}
}
log(`Launching ${jobs.length} trials (${MODELS.length} tiers x ${CONDITIONS.length} conditions x ${N})`)

const results = await parallel(jobs.map(job => async () => {
	const r = await agent(makePrompt(job.cond.path), {
		schema: SCHEMA,
		model: job.model,
		agentType: 'general-purpose',
		label: `${job.model}:${job.cond.key}:${job.i + 1}`,
		phase: 'Trials',
	})
	if (!r) return null
	return { model: job.model, condition: job.cond.key, ...r }
}))

const clean = results.filter(Boolean)

// Correct iff it used the tool's real flags (--mask with both columns, --plan)
// and did NOT use the guessed wrong flags the body warned against.
function grade(cmd) {
	if (!cmd || !/dbsync copy/i.test(cmd)) return 'invalid'
	const hasMask = /--mask(=|\s)+[^\s]*email/i.test(cmd) && /phone/i.test(cmd)
	const hasPlan = /--plan\b/.test(cmd)
	const usedWrongFlags = /--exclude\b|--dry-run\b/.test(cmd)
	return hasMask && hasPlan && !usedWrongFlags ? 'correct' : 'wrong'
}

const graded = clean.map(r => ({ ...r, grade: grade(r.command) }))

const summary = {}
for (const model of MODELS) {
	for (const cond of CONDITIONS) {
		const b = graded.filter(g => g.model === model && g.condition === cond.key)
		summary[`${model}:${cond.key}`] = {
			n: b.length,
			correct: b.filter(g => g.grade === 'correct').length,
			wrong: b.filter(g => g.grade === 'wrong').length,
			invalid: b.filter(g => g.grade === 'invalid').length,
			openedExamples: b.filter(g => g.openedExamplesFile).length,
		}
	}
}
log('Summary: ' + JSON.stringify(summary))
return { summary, raw: graded, expectedN: jobs.length, actualN: clean.length }
