import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import {
	splitFrontmatter,
	extractLinkTargets,
	parseSkill,
	resolveSkillPath,
} from "../src/skill/parse";

const SPLIT_FIXTURE = fileURLToPath(
	new URL(
		"../../../docs/research/fixtures/reference-split-vs-consolidate/split",
		import.meta.url,
	),
);

describe("splitFrontmatter", () => {
	it("parses YAML frontmatter and returns the body", () => {
		const { frontmatter, body } = splitFrontmatter(
			"---\nname: x\ndescription: does y\n---\n# Body\ntext\n",
		);
		expect(frontmatter.name).toBe("x");
		expect(frontmatter.description).toBe("does y");
		expect(body).toBe("# Body\ntext\n");
	});

	it("returns empty frontmatter when none present", () => {
		const { frontmatter, body } = splitFrontmatter("# just a heading\n");
		expect(frontmatter).toEqual({});
		expect(body).toBe("# just a heading\n");
	});

	it("tolerates malformed YAML without throwing", () => {
		const { frontmatter } = splitFrontmatter("---\n: : :\n---\nbody");
		expect(typeof frontmatter).toBe("object");
	});
});

describe("extractLinkTargets", () => {
	it("collects markdown link targets, skipping code fences", () => {
		const body = [
			"See [a](references/a.md) and [b](references/b.md).",
			"```md",
			"[fake](references/should-not-count.md)",
			"```",
		].join("\n");
		expect(extractLinkTargets(body)).toEqual([
			"references/a.md",
			"references/b.md",
		]);
	});
});

describe("parseSkill", () => {
	it("parses name, description, kind and local references", () => {
		const skill = parseSkill(SPLIT_FIXTURE);
		expect(skill.name).toBe("incident-runbooks");
		expect(skill.description).toMatch(/On-call runbooks/);
		expect(skill.kind).toBe("reference");
		expect(skill.references).toHaveLength(3);
		expect(skill.references.every((r) => r.exists)).toBe(true);
		expect(skill.references.map((r) => r.relPath)).toContain(
			"references/database-outage.md",
		);
	});

	it("resolves a directory path to its SKILL.md", () => {
		expect(resolveSkillPath(SPLIT_FIXTURE)).toMatch(/SKILL\.md$/);
	});

	it("throws a clear error when no SKILL.md exists", () => {
		expect(() => parseSkill("/nonexistent/skill/dir")).toThrow(/No SKILL\.md/);
	});

	it("ignores external URLs and anchors as references", () => {
		const skill = parseSkill(SPLIT_FIXTURE);
		expect(
			skill.references.some((r) => r.target.startsWith("http")),
		).toBe(false);
	});
});
