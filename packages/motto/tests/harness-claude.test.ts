import { describe, it, expect } from "vitest";
import {
	extractToolSignals,
	parseStreamJson,
	type Extracted,
} from "../src/harness/claude";

// A synthetic stream-json transcript mirroring the shape Claude Code 2.1 emits
// when an installed skill triggers: a `Skill` tool_use names the skill, and the
// final `result` event carries the answer + usage.
const TRANSCRIPT = [
	'{"type":"system","subtype":"init"}',
	"",
	'{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Skill","input":{"skill":"sentry","args":"list issues"}}]}}',
	'{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Read","input":{"file_path":"/proj/.claude/skills/sentry/SKILL.md"}}]}}',
	"not json, should be ignored",
	'{"type":"result","result":"Here are the issues.","usage":{"input_tokens":120,"output_tokens":45}}',
].join("\n");

describe("parseStreamJson", () => {
	it("parses JSONL, skipping blank and non-JSON lines", () => {
		const events = parseStreamJson(TRANSCRIPT);
		expect(events).toHaveLength(4);
		expect(events.at(-1)?.type).toBe("result");
	});
});

describe("extractToolSignals", () => {
	it("collects Skill invocations as the trigger signal (not Read of SKILL.md)", () => {
		const out: Extracted = { filesRead: [], skillsInvoked: [] };
		extractToolSignals(parseStreamJson(TRANSCRIPT), out);
		expect(out.skillsInvoked).toEqual(["sentry"]);
		expect(out.filesRead).toEqual(["/proj/.claude/skills/sentry/SKILL.md"]);
	});

	it("reports no skill when none was invoked", () => {
		const out: Extracted = { filesRead: [], skillsInvoked: [] };
		extractToolSignals(
			parseStreamJson('{"type":"result","result":"Paris."}'),
			out,
		);
		expect(out.skillsInvoked).toEqual([]);
	});
});
