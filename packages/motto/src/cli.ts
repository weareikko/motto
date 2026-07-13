#!/usr/bin/env node
/**
 * `motto` — the skill-eval CLI.
 *
 *   motto eval <skill>   evaluate a SKILL.md: cost (always) + trigger/claim
 *                        fidelity (when a harness + RUN_EVALS are present)
 *   motto contract <skill>  print the contract derived from the description
 *   motto doctor         report harness + judge availability (zero cost)
 *   motto mcp            run motto's deterministic tools as an MCP stdio server
 *
 * Cost and contract derivation are deterministic and need no credentials, so
 * `motto eval --cost-only` is useful with zero setup. Behavioral metrics cost
 * money and self-skip cleanly when a harness/judge/RUN_EVALS is absent.
 */

import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { defineCommand, runMain } from "citty";
import { config as loadDotenv } from "dotenv";
import { parseSkill } from "./skill/parse";
import { deriveContract } from "./skill/contract";
import { measureCost } from "./metrics/cost";
import { runBehavioral, formatBehavioral } from "./metrics/behavioral";
import { buildReport, formatReport, formatContract } from "./report";
import { detectAll, availableHarnesses } from "./harness/index";
import { judgeAvailable } from "./judge/llm-judge";
import { evalsEnabled } from "./config";
import { startStdio } from "./mcp/server";
import { piDetect } from "./harness/pi-agent";
import { runBench, formatBenchReport } from "./bench/index";

// Load the monorepo-root `.env` so provider creds (ANTHROPIC_API_KEY, the
// Cloudflare AI Gateway vars, …) are present for spend commands (`bench`)
// without requiring the caller to have sourced it themselves. Mirrors
// `vite.eval.config.ts` / `evals/setup.ts`'s loading of the same file.
//
// Deliberately NOT `new URL("../../../.env", import.meta.url)`: Vite's build
// special-cases that exact literal-relative-URL idiom as a static asset
// reference. Since `.env` sits outside the package root, Vite inlines its
// *actual contents* as a base64 `data:` URL baked into `dist/cli.js` (a real
// secret leak into the published package) and `fileURLToPath` then throws on
// the non-`file:` URL at runtime. Computing the path from
// `fileURLToPath(import.meta.url)` + `node:path` avoids the special-cased
// pattern entirely, so the path is resolved at runtime instead of inlined at
// build time.
loadDotenv({
	path: resolvePath(dirname(fileURLToPath(import.meta.url)), "../../../.env"),
	// dotenv v17 prints an "injected env" banner to stdout by default, which
	// corrupts `motto bench --json` (and any piped output). Silence it.
	quiet: true,
});

// Injected by Vite at build time; falls back when run directly via tsx (dev).
const VERSION =
	typeof __PKG_VERSION__ !== "undefined" ? __PKG_VERSION__ : "0.0.0-dev";

const evalCmd = defineCommand({
	meta: { name: "eval", description: "Evaluate a skill against its own description contract." },
	args: {
		skill: {
			type: "positional",
			required: true,
			description: "Path to a skill directory or its SKILL.md",
		},
		"cost-only": {
			type: "boolean",
			description: "Only the deterministic cost + contract (no agent runs)",
			default: false,
		},
		harness: {
			type: "string",
			description: "Comma-separated harness ids to use (default: all available)",
		},
		model: { type: "string", description: "Model id override for the harness" },
		n: { type: "string", description: "Trials per prompt (default 20)" },
		json: { type: "boolean", description: "Emit JSON instead of text", default: false },
	},
	async run({ args }) {
		const skill = parseSkill(args.skill);
		const cost = measureCost(skill);
		const contract = deriveContract(skill.description);
		const report = buildReport(skill, cost, contract);

		// Behavioral metrics: opt-in, gated on harness availability.
		const wantBehavioral = !args["cost-only"] && evalsEnabled();
		let behavioralText: string | undefined;
		if (wantBehavioral) {
			let harnesses = await availableHarnesses();
			if (args.harness) {
				const wanted = args.harness.split(",").map((s) => s.trim());
				harnesses = harnesses.filter((h) => wanted.includes(h.id));
			}
			if (harnesses.length) {
				const n = args.n ? Math.max(1, Number.parseInt(args.n, 10) || 20) : 20;
				const bh = await runBehavioral(skill, contract, {
					harnesses,
					model: args.model,
					n,
				});
				behavioralText = formatBehavioral(bh);
				report.behavioral = { note: behavioralText };
			}
		}

		if (args.json) {
			console.log(JSON.stringify(report, null, 2));
			return;
		}
		console.log(formatReport(report));
	},
});

const contractCmd = defineCommand({
	meta: { name: "contract", description: "Print the contract derived from a skill's description." },
	args: {
		skill: {
			type: "positional",
			required: true,
			description: "Path to a skill directory or its SKILL.md",
		},
		json: { type: "boolean", description: "Emit JSON instead of text", default: false },
	},
	run({ args }) {
		const skill = parseSkill(args.skill);
		const contract = deriveContract(skill.description);
		if (args.json) {
			console.log(JSON.stringify(contract, null, 2));
			return;
		}
		console.log(formatContract(contract));
	},
});

const doctorCmd = defineCommand({
	meta: { name: "doctor", description: "Report harness + judge availability (zero cost)." },
	async run() {
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
		console.log(
			`\nRUN_EVALS=${evalsEnabled() ? "1 (behavioral metrics will run)" : "unset (behavioral metrics skip)"}`,
		);
		if (!rows.some((r) => r.available)) {
			console.log(
				"\nNo harness is runnable — `motto eval` will still report cost + contract.",
			);
		}
	},
});

const DEFAULT_BENCH_PRIORS = "baseline,calibration,orchestration";

const benchCmd = defineCommand({
	meta: {
		name: "bench",
		description:
			"Sweep trigger fidelity for one or more skills across models × priors. SPENDS: makes a live model call per trial.",
	},
	args: {
		skill: {
			type: "positional",
			required: true,
			description: "Path(s) to a skill directory or its SKILL.md",
		},
		models: {
			type: "string",
			required: true,
			description:
				'Comma-separated "provider/modelId" specs, e.g. "cloudflare-ai-gateway/claude-haiku-4-5,cloudflare-ai-gateway/claude-fable-5"',
		},
		priors: {
			type: "string",
			description: `Comma-separated prior ids (default: "${DEFAULT_BENCH_PRIORS}")`,
			default: DEFAULT_BENCH_PRIORS,
		},
		n: {
			type: "string",
			description: "Trials per (skill × model × prior × prompt) cell (default 5)",
			default: "5",
		},
		"max-prompts": {
			type: "string",
			description: "Cap on positive prompts swept per skill (default 2)",
			default: "2",
		},
		json: { type: "boolean", description: "Emit JSON instead of text", default: false },
	},
	async run({ args }) {
		// This is a spend command: only reach the network when creds exist and
		// the user explicitly invoked `motto bench`. `piDetect()` is a
		// zero-network credential check — no call is made before this gate.
		const detected = await piDetect();
		if (!detected.available) {
			console.error(
				`motto bench: cannot run — ${detected.reason ?? "no provider credentials detected"}.`,
			);
			process.exitCode = 1;
			return;
		}

		// citty's positional-arg binding does not remove consumed values from
		// `args._` — it stays the full raw positional list (every skill path the
		// user passed), so it — not `args.skill` alone — is the source of truth
		// for "motto bench <skill...>".
		const skillPaths =
			Array.isArray(args._) && args._.length > 0
				? args._.map(String)
				: [args.skill];
		const models = args.models.split(",").map((s) => s.trim()).filter(Boolean);
		const priorIds = args.priors.split(",").map((s) => s.trim()).filter(Boolean);
		const n = Math.max(1, Number.parseInt(args.n, 10) || 5);
		const maxPromptsPerSkill = Math.max(1, Number.parseInt(args["max-prompts"], 10) || 2);

		const report = await runBench({
			skillPaths,
			models,
			priorIds,
			n,
			maxPromptsPerSkill,
		});

		if (args.json) {
			console.log(JSON.stringify(report, null, 2));
			return;
		}
		console.log(formatBenchReport(report));
	},
});

const mcpCmd = defineCommand({
	meta: {
		name: "mcp",
		description: "Run motto's deterministic tools (cost, contract, band) as an MCP stdio server.",
	},
	async run() {
		await startStdio();
	},
});

const main = defineCommand({
	meta: {
		name: "motto",
		version: VERSION,
		description:
			"Evaluate Claude Code Agent Skills against their own description contract: trigger fidelity, claim fidelity, token cost.",
	},
	subCommands: {
		eval: evalCmd,
		contract: contractCmd,
		bench: benchCmd,
		doctor: doctorCmd,
		mcp: mcpCmd,
	},
});

void runMain(main);
