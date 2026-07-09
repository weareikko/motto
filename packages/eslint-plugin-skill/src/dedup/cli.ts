#!/usr/bin/env node
/**
 * `skill-check-refs` — CLI for cross-skill reference de-duplication.
 *
 * Usage:
 *   skill-check-refs [root] [--scope=plugin|repo] [--near-duplicates]
 *                     [--threshold=0.75] [--ignore=a.md,b.md] [--json]
 */

import { analyzeReferences } from "./analyze";
import { formatReport } from "./report";
import type { AnalyzeOptions } from "./types";

function parseArgs(argv: string[]): { root: string; options: AnalyzeOptions; json: boolean } {
	let root = ".";
	const options: AnalyzeOptions = {};
	let json = false;

	for (const arg of argv) {
		if (arg === "--near-duplicates") {
			options.nearDuplicates = true;
		} else if (arg === "--json") {
			json = true;
		} else if (arg.startsWith("--scope=")) {
			const value = arg.slice("--scope=".length);
			options.scope = value === "repo" ? "repo" : "plugin";
		} else if (arg.startsWith("--threshold=")) {
			options.nearDuplicateThreshold = Number(arg.slice("--threshold=".length));
		} else if (arg.startsWith("--ignore=")) {
			options.ignoreRelPaths = arg
				.slice("--ignore=".length)
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
		} else if (!arg.startsWith("--")) {
			root = arg;
		}
	}

	return { root, options, json };
}

function main(): void {
	const { root, options, json } = parseArgs(process.argv.slice(2));
	const result = analyzeReferences(root, options);

	if (json) {
		console.log(JSON.stringify(result, null, 2));
	} else {
		console.log(formatReport(result));
	}

	// Divergence is a correctness hazard — fail CI on it. Duplicates and
	// near-duplicates are advisory (maintenance suggestions), non-blocking.
	if (result.divergences.length > 0) {
		process.exitCode = 1;
	}
}

main();
