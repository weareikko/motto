#!/usr/bin/env node
/**
 * `motto` — the skill-eval CLI.
 *
 *   motto eval <skill>   evaluate a SKILL.md: cost (always) + trigger/claim
 *                        fidelity (when a harness + RUN_EVALS are present)
 *   motto contract <skill>  print the contract derived from the description
 *   motto doctor         report harness + judge availability (zero cost)
 *
 * Cost and contract derivation are deterministic and need no credentials, so
 * `motto eval --cost-only` is useful with zero setup. Behavioral metrics cost
 * money and self-skip cleanly when a harness/judge/RUN_EVALS is absent.
 */

import { defineCommand, runMain } from "citty";
import { parseSkill } from "./skill/parse";
import { deriveContract } from "./skill/contract";
import { measureCost } from "./metrics/cost";
import { runBehavioral, formatBehavioral } from "./metrics/behavioral";
import { buildReport, formatReport, formatContract } from "./report";
import { detectAll, availableHarnesses } from "./harness/index";
import { judgeAvailable } from "./judge/llm-judge";
import { evalsEnabled } from "./config";

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
		doctor: doctorCmd,
	},
});

void runMain(main);
