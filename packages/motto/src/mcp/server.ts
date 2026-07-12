/**
 * MCP server exposing motto's deterministic, credential-free tools — cost,
 * contract, and band — so any MCP-speaking harness (not just the `motto`
 * CLI) can call them directly.
 *
 * Each tool's core logic lives in a small exported `handle*` function that
 * takes plain args and returns plain data. `registerTool` callbacks are thin
 * wrappers around those handlers (JSON-stringify the result into a text
 * content block), which keeps the handlers unit-testable without spinning up
 * a transport.
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { parseSkill } from "../skill/parse";
import { deriveContract } from "../skill/contract";
import { measureCost } from "../metrics/cost";
import { band } from "../stats/index";
import type { CostReport } from "../metrics/cost";
import type { SkillContract } from "../skill/contract";
import type { BandResult } from "../stats/index";

/** `skill_cost` handler: token-cost report for a skill directory/SKILL.md. */
export function handleSkillCost(args: { skillPath: string }): CostReport {
	return measureCost(parseSkill(args.skillPath));
}

/** `skill_contract` handler: claim/triggers derived from a skill's description. */
export function handleSkillContract(args: { skillPath: string }): SkillContract {
	return deriveContract(parseSkill(args.skillPath).description);
}

/** `score_band` handler: Wilson-CI-based reliability band for passed/n trials. */
export function handleScoreBand(args: { passed: number; n: number }): BandResult {
	return band(args.passed, args.n);
}

/** Wrap a JSON-serializable result as a single-text-block tool result. */
function jsonResult(value: unknown) {
	return {
		content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
	};
}

/** Build the motto MCP server and register its tools. Does not connect a transport. */
export function createMottoServer(): McpServer {
	const server = new McpServer({ name: "motto", version: "0.1.0" });

	server.registerTool(
		"skill_cost",
		{
			description:
				"Measure a skill's token cost (index/body/references/worst-case) via motto's measureCost.",
			inputSchema: {
				skillPath: z.string().describe("Path to a skill directory or its SKILL.md"),
			},
		},
		({ skillPath }) => jsonResult(handleSkillCost({ skillPath })),
	);

	server.registerTool(
		"skill_contract",
		{
			description:
				"Derive a skill's testable contract (claim + triggers) from its frontmatter description.",
			inputSchema: {
				skillPath: z.string().describe("Path to a skill directory or its SKILL.md"),
			},
		},
		({ skillPath }) => jsonResult(handleSkillContract({ skillPath })),
	);

	server.registerTool(
		"score_band",
		{
			description:
				"Assign a Wilson-CI-based reliability band (always/usually/mixed/rarely/uncertain) to passed/n trials.",
			inputSchema: {
				passed: z.number().int().nonnegative().describe("Number of passing trials"),
				n: z.number().int().nonnegative().describe("Total number of trials"),
			},
		},
		({ passed, n }) => jsonResult(handleScoreBand({ passed, n })),
	);

	return server;
}

/** Connect the motto MCP server over stdio and keep it running. */
export async function startStdio(): Promise<void> {
	const server = createMottoServer();
	const transport = new StdioServerTransport();
	await server.connect(transport);
}
