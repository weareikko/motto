// Reproduction script for docs/research/multi-domain-selection.md.
// Resolves backlog #4 (table vs prose selection logic) and #6 (ambiguous-query
// fallback / hedging risk) in one test.
//
// Run with:
//   Workflow({ scriptPath: 'docs/research/scripts/multi-domain-selection.workflow.js' })
//
// IMPORTANT: Workflow scripts have no filesystem access, so PROSE_PATH and
// TABLE_PATH below must be absolute paths on the machine running the workflow.
// Point them at your checkout of:
//   docs/research/fixtures/multi-domain-selection/prose/SKILL.md
//   docs/research/fixtures/multi-domain-selection/table/SKILL.md

export const meta = {
	name: 'multi-domain-selection',
	description: 'N-trial blind test: table vs prose variant-selection logic, on clear vs deliberately-ambiguous queries; measures correct selection AND how many variant files get opened (hedging under ambiguity)',
	phases: [{ title: 'Trials', detail: '{table,prose} x {clear,ambiguous} x N, one query per trial' }],
}

// EDIT THESE to your checkout's absolute paths before running.
const PROSE_PATH = '/absolute/path/to/docs/research/fixtures/multi-domain-selection/prose/SKILL.md'
const TABLE_PATH = '/absolute/path/to/docs/research/fixtures/multi-domain-selection/table/SKILL.md'

const FORMATS = [
	{ key: 'prose', path: PROSE_PATH },
	{ key: 'table', path: TABLE_PATH },
]

// Clear queries name exactly one provider (expected: pick it, open only its
// file). Ambiguous queries name a capability all three clouds offer without
// naming the cloud (expected: recognize the ambiguity and ask, NOT silently
// pick and NOT hedge by reading all three).
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
		chosenProvider: {
			type: 'string',
			description: 'aws | gcp | azure | none (if you asked for clarification instead of choosing)',
		},
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
log(`Fixture paths — prose: ${PROSE_PATH} | table: ${TABLE_PATH}`)

const jobs = []
for (const format of FORMATS) {
	for (const level of ['clear', 'ambiguous']) {
		const pool = QUERIES[level]
		for (let i = 0; i < N; i++) {
			jobs.push({ format, level, query: pool[i % pool.length], i })
		}
	}
}

log(`Launching ${jobs.length} trials (${FORMATS.length} formats x 2 levels x ${N})`)

const results = await parallel(jobs.map(job => async () => {
	const result = await agent(makePrompt(job.format.path, job.query.text), {
		schema: SCHEMA,
		agentType: 'general-purpose',
		label: `${job.format.key}:${job.level}:${job.i + 1}`,
		phase: 'Trials',
	})
	if (!result) return null
	return {
		format: job.format.key,
		level: job.level,
		expected: job.query.expected,
		query: job.query.text,
		...result,
	}
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
		// ambiguous
		outcome = r.askedForClarification ? 'asked_for_clarification'
			: filesOpened >= 2 ? 'hedged_opened_multiple'
			: 'silently_picked_one'
	}
	return { ...r, filesOpened, outcome }
})

const summary = {}
for (const format of FORMATS) {
	for (const level of ['clear', 'ambiguous']) {
		const bucket = graded.filter(g => g.format === format.key && g.level === level)
		const counts = {}
		for (const g of bucket) counts[g.outcome] = (counts[g.outcome] || 0) + 1
		const avgFiles = bucket.length
			? Math.round((bucket.reduce((s, g) => s + g.filesOpened, 0) / bucket.length) * 100) / 100
			: null
		summary[`${format.key}:${level}`] = { n: bucket.length, outcomes: counts, avgVariantFilesOpened: avgFiles }
	}
}

log('Summary: ' + JSON.stringify(summary))
return { summary, raw: graded, expectedN: jobs.length, actualN: clean.length }
