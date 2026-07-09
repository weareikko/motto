// Reproduction script for docs/research/meta-cross-reference.md (backlog #10).
// Does [[skill-name]]-style explicit cross-referencing improve routing accuracy
// vs plain prose naming of the same skills, at matched content?
//
// Run: Workflow({ scriptPath: 'docs/research/scripts/meta-cross-reference.workflow.js' })
// No filesystem access needed — the router bodies are inlined below (they mirror
// docs/research/fixtures/meta-cross-reference/{bracket,prose}.md).

export const meta = {
	name: 'meta-cross-reference',
	description: 'N=20 x 2 formats: [[bracket]] cross-references vs prose skill mentions in a meta/router body; measures correct routing on realistic release-ops queries',
	phases: [{ title: 'Trials', detail: 'bracket vs prose x N=20, one query per trial' }],
}

const BRACKET = `# release-orchestrator

Route the request to exactly one specialized skill and output only that skill's name.

- For cutting a new production release (tagging, building, promoting a version): use [[deploy-release]].
- For reverting a bad release back to a previous version: use [[rollback-release]].
- For generating or updating the changelog / release notes from commits: use [[changelog-writer]].
- For responding to a live production incident (paging, mitigation, status updates): use [[incident-responder]].
- For scheduling or announcing an upcoming maintenance window: use [[maintenance-notice]].`

const PROSE = `# release-orchestrator

Route the request to exactly one specialized skill and output only that skill's name.

For cutting a new production release (tagging, building, promoting a version), the deploy-release skill handles it. For reverting a bad release back to a previous version, the rollback-release skill handles it. For generating or updating the changelog or release notes from commits, the changelog-writer skill handles it. For responding to a live production incident such as paging, mitigation, or status updates, the incident-responder skill handles it. For scheduling or announcing an upcoming maintenance window, the maintenance-notice skill handles it.`

const FORMATS = { bracket: BRACKET, prose: PROSE }

// Queries phrased so the mapping requires reading the descriptions, not just
// keyword-matching the skill name (e.g. "back out last night's deploy" ->
// rollback-release, not deploy-release).
const QUERIES = [
	{ text: "We need to back out last night's deploy, it broke checkout.", expected: 'rollback-release' },
	{ text: 'Cut version 2.4.0 to production — tag, build, and promote it.', expected: 'deploy-release' },
	{ text: 'Pull together the release notes for everything that merged this sprint.', expected: 'changelog-writer' },
	{ text: 'The payments service is down and customers are affected — start the response.', expected: 'incident-responder' },
	{ text: "Let everyone know we're taking the DB offline Sunday 2-4am for an upgrade.", expected: 'maintenance-notice' },
]

const SCHEMA = {
	type: 'object',
	properties: { chosenSkill: { type: 'string' } },
	required: ['chosenSkill'],
}

function makePrompt(body, queryText) {
	return `You will be shown the body of a router skill. Read it, then decide which single specialized skill should handle the request. Output only the skill name.\n\n<router>\n${body}\n</router>\n\nRequest: "${queryText}"`
}

const N = 20

phase('Trials')

const jobs = []
for (const [format, body] of Object.entries(FORMATS)) {
	for (let i = 0; i < N; i++) {
		jobs.push({ format, body, query: QUERIES[i % QUERIES.length], i })
	}
}
log(`Launching ${jobs.length} trials (2 formats x ${N})`)

const results = await parallel(jobs.map(job => async () => {
	const r = await agent(makePrompt(job.body, job.query.text), {
		schema: SCHEMA,
		agentType: 'general-purpose',
		label: `${job.format}:${job.i + 1}`,
		phase: 'Trials',
	})
	if (!r) return null
	return { format: job.format, expected: job.query.expected, query: job.query.text, chosenSkill: r.chosenSkill }
}))

const clean = results.filter(Boolean)

function normalize(s) { return (s || '').toLowerCase().replace(/[^a-z-]/g, '') }

const graded = clean.map(r => ({ ...r, correct: normalize(r.chosenSkill).includes(r.expected) }))

const summary = {}
for (const format of Object.keys(FORMATS)) {
	const b = graded.filter(g => g.format === format)
	// per-query breakdown too, to catch a single hard query dominating
	const perQuery = {}
	for (const q of QUERIES) {
		const qb = b.filter(g => g.expected === q.expected)
		perQuery[q.expected] = { n: qb.length, correct: qb.filter(g => g.correct).length }
	}
	summary[format] = { n: b.length, correct: b.filter(g => g.correct).length, perQuery }
}
log('Summary: ' + JSON.stringify(summary))
return { summary, raw: graded, expectedN: jobs.length, actualN: clean.length }
