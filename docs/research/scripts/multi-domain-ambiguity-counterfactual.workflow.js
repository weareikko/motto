// Reproduction script for docs/research/multi-domain-ambiguity-counterfactual.md.
// Resolves backlog #6b: is the ambiguity-fallback instruction load-bearing?
//
// Runs BOTH arms fresh in one workflow (identical conditions, directly
// comparable) rather than comparing against the earlier #4/#6 run:
//   - withInstruction: the prose SKILL.md that DOES tell the agent to ask
//     rather than read every file under ambiguity.
//   - noInstruction: the same SKILL.md with ONLY that ambiguity-fallback
//     paragraph removed (normal-case selection logic kept identical).
//
// Run with:
//   Workflow({ scriptPath: 'docs/research/scripts/multi-domain-ambiguity-counterfactual.workflow.js' })
//
// IMPORTANT: Workflow scripts have no filesystem access — edit the two PATH
// constants to your checkout's absolute paths first. Point them at:
//   docs/research/fixtures/multi-domain-selection/prose/SKILL.md
//   docs/research/fixtures/multi-domain-selection/no-instruction/SKILL.md

export const meta = {
	name: 'multi-domain-ambiguity-counterfactual',
	description: 'N-trial A/B: does REMOVING the "ask, don\'t hedge" instruction make agents hedge (open all variant files) or silently pick under ambiguous queries?',
	phases: [{ title: 'Trials', detail: '{withInstruction,noInstruction} x {clear,ambiguous} x N' }],
}

// EDIT THESE to your checkout's absolute paths before running.
const WITH_INSTRUCTION_PATH = '/absolute/path/to/docs/research/fixtures/multi-domain-selection/prose/SKILL.md'
const NO_INSTRUCTION_PATH = '/absolute/path/to/docs/research/fixtures/multi-domain-selection/no-instruction/SKILL.md'

const CONDITIONS = [
	{ key: 'withInstruction', path: WITH_INSTRUCTION_PATH },
	{ key: 'noInstruction', path: NO_INSTRUCTION_PATH },
]

const QUERIES = {
	clear: [
		{ text: 'Deploy our Node service to AWS ECS Fargate.', expected: 'aws' },
		{ text: 'Ship the API to Google Cloud Run in europe-west1.', expected: 'gcp' },
		{ text: 'Release the web app to Azure App Service.', expected: 'azure' },
	],
	ambiguous: [
		{ text: 'Deploy our Node service to our managed Kubernetes cluster.', expected: 'ASK' },
		{ text: 'Ship this to whichever cloud we already run our container workloads on.', expected: 'ASK' },
	],
}

const N = 20

const SCHEMA = {
	type: 'object',
	properties: {
		chosenProvider: { type: 'string', description: 'aws | gcp | azure | none' },
		askedForClarification: { type: 'boolean' },
		variantFilesOpened: {
			type: 'string',
			description: 'comma-separated variant reference filenames you actually opened, e.g. "aws.md" or "aws.md, gcp.md, azure.md" or "none"',
		},
	},
	required: ['chosenProvider', 'askedForClarification', 'variantFilesOpened'],
}

function makePrompt(path, queryText) {
	return `A deployment skill is available at the absolute path: ${path}

Read it and follow its guidance (open only the reference file(s) the skill directs you to). Then handle this request:

"${queryText}"

Report: which provider you chose (aws/gcp/azure, or "none" if you asked for clarification instead), whether you asked the user for clarification, and exactly which variant reference filename(s) you opened.`
}

phase('Trials')
log(`with-instruction: ${WITH_INSTRUCTION_PATH}`)
log(`no-instruction:   ${NO_INSTRUCTION_PATH}`)

const jobs = []
for (const cond of CONDITIONS) {
	for (const level of ['clear', 'ambiguous']) {
		const pool = QUERIES[level]
		for (let i = 0; i < N; i++) {
			jobs.push({ cond, level, query: pool[i % pool.length], i })
		}
	}
}

log(`Launching ${jobs.length} trials (${CONDITIONS.length} conditions x 2 levels x ${N})`)

const results = await parallel(jobs.map(job => async () => {
	const result = await agent(makePrompt(job.cond.path, job.query.text), {
		schema: SCHEMA,
		agentType: 'general-purpose',
		label: `${job.cond.key}:${job.level}:${job.i + 1}`,
		phase: 'Trials',
	})
	if (!result) return null
	return { condition: job.cond.key, level: job.level, expected: job.query.expected, query: job.query.text, ...result }
}))

const clean = results.filter(Boolean)

function countVariantFiles(s) {
	const t = (s || '').toLowerCase()
	let n = 0
	if (t.includes('aws.md')) n++
	if (t.includes('gcp.md')) n++
	if (t.includes('azure.md')) n++
	return n
}

const graded = clean.map(r => {
	const filesOpened = countVariantFiles(r.variantFilesOpened)
	let outcome
	if (r.level === 'clear') {
		const correct = (r.chosenProvider || '').toLowerCase().includes(r.expected)
		outcome = correct && filesOpened === 1 ? 'correct_single_file'
			: correct ? 'correct_but_multi_file'
			: 'wrong_provider'
	} else {
		outcome = r.askedForClarification ? 'asked_for_clarification'
			: filesOpened >= 2 ? 'hedged_opened_multiple'
			: filesOpened === 1 ? 'silently_picked_one'
			: 'no_file_no_ask'
	}
	return { ...r, filesOpened, outcome }
})

const summary = {}
for (const cond of CONDITIONS) {
	for (const level of ['clear', 'ambiguous']) {
		const bucket = graded.filter(g => g.condition === cond.key && g.level === level)
		const counts = {}
		for (const g of bucket) counts[g.outcome] = (counts[g.outcome] || 0) + 1
		const avgFiles = bucket.length
			? Math.round((bucket.reduce((s, g) => s + g.filesOpened, 0) / bucket.length) * 100) / 100
			: null
		summary[`${cond.key}:${level}`] = { n: bucket.length, outcomes: counts, avgVariantFilesOpened: avgFiles }
	}
}

log('Summary: ' + JSON.stringify(summary))
return { summary, raw: graded, expectedN: jobs.length, actualN: clean.length }
