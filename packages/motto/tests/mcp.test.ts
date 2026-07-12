import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
	handleSkillCost,
	handleSkillContract,
	handleScoreBand,
	createMottoServer,
} from "../src/mcp/server";

// Same fixture used by tests/cost.test.ts — a real skill directory with
// frontmatter, a body, and on-disk reference files.
const SPLIT_FIXTURE = fileURLToPath(
	new URL(
		"../../../docs/research/fixtures/reference-split-vs-consolidate/split",
		import.meta.url,
	),
);

// These call the exported handler functions directly (no transport, no
// server instance) — the MCP wiring in createMottoServer/startStdio is a
// thin, untested-by-design JSON-stringify wrapper around these.

describe("handleSkillCost", () => {
	it("returns the same shape as measureCost", () => {
		const cost = handleSkillCost({ skillPath: SPLIT_FIXTURE });
		expect(typeof cost.indexTokens).toBe("number");
		expect(typeof cost.bodyTokens).toBe("number");
		expect(cost.indexTokens).toBeGreaterThan(0);
		expect(cost.bodyTokens).toBeGreaterThan(0);
		expect(Array.isArray(cost.references)).toBe(true);
		expect(cost.references).toHaveLength(3);
	});
});

describe("handleSkillContract", () => {
	it("returns the claim + triggers derived from the skill's description", () => {
		const contract = handleSkillContract({ skillPath: SPLIT_FIXTURE });
		expect(typeof contract.claim).toBe("string");
		expect(contract.claim.length).toBeGreaterThan(0);
		expect(Array.isArray(contract.triggers)).toBe(true);
	});
});

describe("handleScoreBand", () => {
	it("returns a band + Wilson interval for passed/n", () => {
		const result = handleScoreBand({ passed: 0, n: 20 });
		expect(result.band).toBe("rarely");
		expect(typeof result.lo).toBe("number");
		expect(typeof result.hi).toBe("number");
		expect(typeof result.point).toBe("number");
	});

	it("throws (not NaN) when passed > n", () => {
		expect(() => handleScoreBand({ passed: 25, n: 20 })).toThrow(RangeError);
	});
});

// End-to-end over a real (in-memory) transport + Client, so we exercise the
// actual `registerTool` wiring — including the SDK's own catch that turns a
// thrown handler error into a clean `isError` tool result instead of a
// crashed connection.
describe("createMottoServer over an in-memory transport", () => {
	async function connectedClient() {
		const server = createMottoServer();
		const client = new Client({ name: "test-client", version: "0.0.0" });
		const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
		await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
		return client;
	}

	it("a bad skillPath surfaces as a clean isError tool result, not a crash", async () => {
		const client = await connectedClient();
		const result = await client.callTool({
			name: "skill_cost",
			arguments: { skillPath: "/nonexistent/SKILL.md" },
		});
		expect(result.isError).toBe(true);
		const content = result.content as Array<{ text: string }>;
		expect(content[0]?.text).toMatch(/no skill\.md/i);
	});

	it("a passed > n score_band call surfaces as a clean isError tool result", async () => {
		const client = await connectedClient();
		const result = await client.callTool({
			name: "score_band",
			arguments: { passed: 25, n: 20 },
		});
		expect(result.isError).toBe(true);
	});
});
