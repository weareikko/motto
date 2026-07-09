// Reproduction script for docs/research/reference-split-vs-consolidate.md.
//
// Run with:
//   Workflow({ scriptPath: 'docs/research/scripts/reference-split-vs-consolidate.workflow.js' })
//
// IMPORTANT: Workflow scripts have no filesystem access, so CONSOLIDATED_PATH
// and SPLIT_PATH below must be absolute paths on the machine running the
// workflow. Point them at your checkout of:
//   docs/research/fixtures/reference-split-vs-consolidate/consolidated/SKILL.md
//   docs/research/fixtures/reference-split-vs-consolidate/split/SKILL.md
// (both link to their own references/ directory, already checked in
// alongside them).

export const meta = {
	name: 'reference-split-vs-consolidate',
	description: 'N-trial blind test: one consolidated reference file vs three topic-split files, correctness + actual files-opened behavior',
	phases: [{ title: 'Trials', detail: 'consolidated vs split, N each, 3 incident scenarios per trial' }],
}

// EDIT THESE two constants to your checkout's absolute paths before running.
const CONSOLIDATED_PATH = '/absolute/path/to/docs/research/fixtures/reference-split-vs-consolidate/consolidated/SKILL.md'
const SPLIT_PATH = '/absolute/path/to/docs/research/fixtures/reference-split-vs-consolidate/split/SKILL.md'

const CONDITIONS = [
	{ key: 'consolidated', path: CONSOLIDATED_PATH },
	{ key: 'split', path: SPLIT_PATH },
]
const N = 20

const SCHEMA = {
	type: 'object',
	properties: {
		dbCommand: { type: 'string' },
		dbAvoid: { type: 'string' },
		dbFilesOpened: { type: 'string' },
		networkCommand: { type: 'string' },
		networkAvoid: { type: 'string' },
		networkFilesOpened: { type: 'string' },
		authCommand: { type: 'string' },
		authAvoid: { type: 'string' },
		authFilesOpened: { type: 'string' },
	},
	required: [
		'dbCommand', 'dbAvoid', 'dbFilesOpened',
		'networkCommand', 'networkAvoid', 'networkFilesOpened',
		'authCommand', 'authAvoid', 'authFilesOpened',
	],
}

function makePrompt(path) {
	return `A reference skill for on-call incident runbooks is available at the absolute path: ${path}

Read it (and open whichever reference file(s) it points you to, following any links) before answering. You have three separate incidents to triage. For EACH incident, report: the primary command(s) to run, what to explicitly avoid doing, and which reference filename(s) you actually opened to answer that specific incident (just the filename, e.g. "runbooks.md" or "database-outage.md").

Incident A (db*): "Getting connection pool exhausted errors on the primary DB during peak traffic. What should I run, and what should I avoid?"
Incident B (network*): "Latency between us-east and eu-west has spiked hard the last 10 minutes. What should I check and what should I avoid?"
Incident C (auth*): "SSO logins are failing for a growing number of users. What should I check and what should I avoid?"`
}

phase('Trials')
log(`Fixture paths — consolidated: ${CONSOLIDATED_PATH} | split: ${SPLIT_PATH}`)

const jobs = []
for (const cond of CONDITIONS) {
	for (let i = 0; i < N; i++) {
		jobs.push({ cond, i })
	}
}

log(`Launching ${jobs.length} trials (${CONDITIONS.length} conditions x ${N} each, 3 incidents per trial)`)

const results = await parallel(jobs.map(job => async () => {
	const result = await agent(makePrompt(job.cond.path), {
		schema: SCHEMA,
		agentType: 'general-purpose',
		label: `${job.cond.key}:${job.i + 1}`,
		phase: 'Trials',
	})
	if (!result) return null
	return { condition: job.cond.key, ...result }
}))

const clean = results.filter(Boolean)

// Correctness per incident: the right primary command family must appear,
// the right avoidance must be mentioned, and the WRONG topic's commands must
// NOT appear (cross-contamination check — a real risk if the wrong file, or
// no file, gets consulted).
const CHECKS = {
	db: {
		command: /dbctl (pool (drain|resize)|status)/i,
		avoid: /restart.*(primary|database)/i,
		wrongTopic: /(netctl|authctl)/i,
	},
	network: {
		command: /netctl (bgp|route failover|latency)/i,
		avoid: /restart.*(edge router|router)/i,
		wrongTopic: /(dbctl|authctl)/i,
	},
	auth: {
		command: /authctl cert/i,
		avoid: /restart.*(auth service|auth)/i,
		wrongTopic: /(dbctl|netctl)/i,
	},
}

function gradeIncident(r, topic) {
	const check = CHECKS[topic]
	const command = r[`${topic}Command`] || ''
	const avoid = r[`${topic}Avoid`] || ''
	const combined = `${command} ${avoid}`
	return {
		correctCommand: check.command.test(command),
		correctAvoid: check.avoid.test(avoid),
		crossContaminated: check.wrongTopic.test(combined),
		filesOpened: r[`${topic}FilesOpened`] || '',
	}
}

const graded = clean.map(r => ({
	condition: r.condition,
	db: gradeIncident(r, 'db'),
	network: gradeIncident(r, 'network'),
	auth: gradeIncident(r, 'auth'),
}))

const summary = {}
for (const cond of CONDITIONS) {
	const bucket = graded.filter(g => g.condition === cond.key)
	const perTopic = {}
	for (const topic of ['db', 'network', 'auth']) {
		const items = bucket.map(b => b[topic])
		perTopic[topic] = {
			n: items.length,
			correctCommand: items.filter(i => i.correctCommand).length,
			correctAvoid: items.filter(i => i.correctAvoid).length,
			crossContaminated: items.filter(i => i.crossContaminated).length,
			filesOpenedSample: items.slice(0, 5).map(i => i.filesOpened),
		}
	}
	summary[cond.key] = { n: bucket.length, perTopic }
}

log('Summary: ' + JSON.stringify(summary))
return { summary, raw: graded, rawWithFiles: clean, expectedN: jobs.length, actualN: clean.length }
