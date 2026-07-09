// Reproduction script for docs/research/meta-dispatch-table-vs-prose.md.
//
// Run with: Workflow({ scriptPath: 'docs/research/scripts/meta-dispatch-table-vs-prose.workflow.js' })
//
// Content below mirrors docs/research/fixtures/meta-dispatch-table-vs-prose/*.
// Workflow scripts have no filesystem access, so the fixture text is
// duplicated here rather than read from disk — if you edit the fixtures,
// update this file to match.

export const meta = {
	name: 'meta-dispatch-table-vs-prose',
	description: 'Blind trial: markdown dispatch table vs prose for a meta/router skill (N per format)',
	phases: [{ title: 'Trials', detail: 'prose vs table, N trials each, 7 classification queries per trial' }],
}

const N = 3 // original run used 3 trials per format

const ROUTER_PROSE = `# support-router

You are a request router. Based on the user's request, decide which specialized skill should handle it and output ONLY the skill name.

Available skills:

The ledger-close skill handles month-end financial closing tasks — reconciling accounts, tying out trial balances, and finalizing journal entries for a closed accounting period. Use it when the user is working through the close process itself.

The ledger-audit skill handles financial audit and compliance review — examining journal entries and financial records for compliance issues, unusual transactions, or audit trail requests, typically for external or internal audit purposes rather than the closing process itself.

The fleet-routing skill handles vehicle and delivery route planning — calculating or recalculating delivery routes, reassigning drivers, and handling schedule disruptions caused by staffing or logistics changes.

The fleet-maintenance skill handles vehicle maintenance — scheduling service appointments, tracking mileage-based maintenance intervals, and logging repair history for the fleet.

The onboarding-docs skill handles new-employee onboarding — generating onboarding packets, checklists, and documentation for new hires starting soon.`

const ROUTER_TABLE = `# support-router

You are a request router. Based on the user's request, decide which specialized skill should handle it and output ONLY the skill name.

| Skill | Handles |
| --- | --- |
| ledger-close | Month-end financial closing: reconciling accounts, tying out trial balances, finalizing journal entries for a closed period. |
| ledger-audit | Financial audit/compliance review: examining journal entries for compliance issues, unusual transactions, audit trail requests. |
| fleet-routing | Vehicle/delivery route planning: calculating or recalculating routes, reassigning drivers, handling schedule disruptions. |
| fleet-maintenance | Vehicle maintenance: scheduling service, tracking mileage-based intervals, logging repair history. |
| onboarding-docs | New-employee onboarding: generating onboarding packets, checklists, documentation for new hires. |`

// Mirrors docs/research/fixtures/meta-dispatch-table-vs-prose/queries.json.
// Query 3's "expected" is a documented judgment call, not infallible ground
// truth — see the note field and the write-up's methodological caveat.
const QUERIES = [
	{ id: 1, text: 'We just closed the books for March — can you reconcile the trial balance and confirm everything ties out?', expected: 'ledger-close' },
	{ id: 2, text: 'Compliance is asking for the March audit trail on all manual journal entries over $10k.', expected: 'ledger-audit' },
	{ id: 3, text: 'Can you check the March journal entries for anything that looks off before we finalize the books?', expected: 'ledger-close' },
	{ id: 4, text: "Recalculate today's delivery routes — driver 12 called in sick.", expected: 'fleet-routing' },
	{ id: 5, text: 'Truck 12 is due for its 50,000 mile service, can you get that scheduled?', expected: 'fleet-maintenance' },
	{ id: 6, text: 'Truck 12 has been falling behind on its delivery schedule the last few days — can you sort it out?', expected: 'fleet-routing' },
	{ id: 7, text: 'New hire starts Monday — please generate their onboarding packet.', expected: 'onboarding-docs' },
]

const SCHEMA = {
	type: 'object',
	properties: Object.fromEntries(QUERIES.map(q => [`q${q.id}`, { type: 'string' }])),
	required: QUERIES.map(q => `q${q.id}`),
}

function makePrompt(routerBody) {
	const list = QUERIES.map(q => `${q.id}. "${q.text}"`).join('\n')
	return `You will be shown the body of a "router" skill whose job is to pick which specialized skill should handle a user request. Read it carefully, then classify each of the ${QUERIES.length} requests below into exactly one skill. Do not explain your reasoning.

<router>
${routerBody}
</router>

Requests to classify:
${list}

Answer with one skill name per request, keyed q1..q${QUERIES.length}.`
}

phase('Trials')

const FORMATS = { prose: ROUTER_PROSE, table: ROUTER_TABLE }
const jobs = []
for (const [format, body] of Object.entries(FORMATS)) {
	for (let i = 0; i < N; i++) {
		jobs.push({ format, body, i })
	}
}

log(`Launching ${jobs.length} trials (2 formats x ${N})`)

const results = await parallel(jobs.map(job => async () => {
	const result = await agent(makePrompt(job.body), {
		schema: SCHEMA,
		agentType: 'general-purpose',
		label: `${job.format}:${job.i + 1}`,
		phase: 'Trials',
	})
	if (!result) return null
	return { format: job.format, answers: result }
}))

const clean = results.filter(Boolean)
const summary = {}
for (const format of Object.keys(FORMATS)) {
	const bucket = clean.filter(r => r.format === format)
	const perQuery = QUERIES.map(q => {
		const correct = bucket.filter(r => r.answers[`q${q.id}`] === q.expected).length
		return { id: q.id, correct, n: bucket.length }
	})
	summary[format] = { n: bucket.length, perQuery }
}

log('Summary: ' + JSON.stringify(summary))
return { summary, raw: clean }
