// Reproduction script for docs/research/tag-structured-steps.md.
//
// Run with: Workflow({ scriptPath: 'docs/research/scripts/tag-structured-steps.workflow.js' })
//
// Content below mirrors docs/research/fixtures/tag-structured-steps/*.md.
// Workflow scripts have no filesystem access, so the fixture text is
// duplicated here rather than read from disk — if you edit the fixtures,
// update this file to match.

export const meta = {
	name: 'tag-structured-steps',
	description: 'Blind trial: <steps><step> tags vs markdown ordered list for procedural content (2 adversarial cases x 2 formats x N trials)',
	phases: [{ title: 'Trials', detail: 'nested-list + code-fence cases, tagged vs markdown, N per cell' }],
}

const N = 3 // original run used 3 trials per cell; raise for more power

const CASES = {
	'nested-list': {
		markdown: `# deploy-app

1. Confirm the target environment with the user (staging or production).
2. Run the pre-flight checks:
   1. Verify the branch is up to date with main.
   2. Confirm CI is green.
   3. Check no migrations are pending.
3. Build the release artifact.
4. Upload the artifact to the environment.
5. Run the smoke tests and report the result.`,
		tagged: `# deploy-app

<steps>
<step>Confirm the target environment with the user (staging or production).</step>
<step>Run the pre-flight checks:
1. Verify the branch is up to date with main.
2. Confirm CI is green.
3. Check no migrations are pending.
</step>
<step>Build the release artifact.</step>
<step>Upload the artifact to the environment.</step>
<step>Run the smoke tests and report the result.</step>
</steps>`,
		expectedCount: 5,
	},
	'code-fence': {
		markdown: `# rollback-release

1. Identify the last known-good release tag using \`git tag --sort=-creatordate | head -5\`.
2. Run the rollback script:
   \`\`\`
   1) stop service
   2) checkout tag
   3) restart service
   \`\`\`
   Confirm each numbered stage above completes without error before continuing.
3. Verify the health check endpoint returns 200.
4. Notify the on-call channel with the rollback tag and timestamp.`,
		tagged: `# rollback-release

<steps>
<step>Identify the last known-good release tag using \`git tag --sort=-creatordate | head -5\`.</step>
<step>Run the rollback script:
\`\`\`
1) stop service
2) checkout tag
3) restart service
\`\`\`
Confirm each numbered stage above completes without error before continuing.</step>
<step>Verify the health check endpoint returns 200.</step>
<step>Notify the on-call channel with the rollback tag and timestamp.</step>
</steps>`,
		expectedCount: 4,
	},
}

const SCHEMA = {
	type: 'object',
	properties: {
		topLevelStepCount: { type: 'integer' },
		stepLabels: { type: 'string' },
	},
	required: ['topLevelStepCount', 'stepLabels'],
}

function makePrompt(procedure) {
	return `You will be shown the body of a procedure written for an AI agent to follow. Read it carefully, then answer precisely.

<procedure>
${procedure}
</procedure>

Report the top-level step count and a semicolon-separated short label (3-6 words) for each top-level step, in order.`
}

phase('Trials')

const jobs = []
for (const [caseName, variants] of Object.entries(CASES)) {
	for (const format of ['markdown', 'tagged']) {
		for (let i = 0; i < N; i++) {
			jobs.push({ caseName, format, procedure: variants[format], expectedCount: variants.expectedCount, i })
		}
	}
}

log(`Launching ${jobs.length} trials (${Object.keys(CASES).length} cases x 2 formats x ${N})`)

const results = await parallel(jobs.map(job => async () => {
	const result = await agent(makePrompt(job.procedure), {
		schema: SCHEMA,
		agentType: 'general-purpose',
		label: `${job.caseName}:${job.format}:${job.i + 1}`,
		phase: 'Trials',
	})
	if (!result) return null
	return { case: job.caseName, format: job.format, expectedCount: job.expectedCount, ...result }
}))

const clean = results.filter(Boolean)
const summary = {}
for (const [caseName] of Object.entries(CASES)) {
	for (const format of ['markdown', 'tagged']) {
		const bucket = clean.filter(r => r.case === caseName && r.format === format)
		const correct = bucket.filter(r => r.topLevelStepCount === r.expectedCount).length
		summary[`${caseName}:${format}`] = { n: bucket.length, correct }
	}
}

log('Summary: ' + JSON.stringify(summary))
return { summary, raw: clean }
