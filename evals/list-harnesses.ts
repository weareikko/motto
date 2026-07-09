/**
 * Diagnostic: print which harnesses and the LLM judge are runnable right now.
 * Zero cost — only checks binaries on PATH and credential env vars.
 *
 * Run: npx tsx evals/list-harnesses.ts
 */

import { detectAll } from "./harness/index.ts";
import { judgeAvailable } from "./judge/llm-judge.ts";
import { evalsEnabled } from "./config.ts";

async function main(): Promise<void> {
	const rows = await detectAll();
	console.log("Harnesses:");
	for (const r of rows) {
		const mark = r.available ? "✓" : "✗";
		console.log(
			`  ${mark} ${r.id.padEnd(9)} ${r.displayName}${r.reason ? `  — ${r.reason}` : ""}`,
		);
	}
	const j = judgeAvailable();
	console.log(
		`\nLLM judge (Cloudflare AI Gateway): ${j.available ? "✓ ready" : `✗ ${j.reason}`}`,
	);
	console.log(`\nRUN_EVALS=${evalsEnabled() ? "1 (evals will run)" : "unset (evals skip)"}`);
}

void main();
