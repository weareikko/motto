import { describe, expect, it } from "vitest";

import { declaredKind, detectKind } from "../../src/utils/kind";

describe("declaredKind", () => {
	it("reads metadata.kind when it is a recognized kind", () => {
		expect(declaredKind({ metadata: { kind: "procedural" } })).toBe(
			"procedural",
		);
	});

	it("returns undefined for a missing, malformed, or unrecognized declaration", () => {
		expect(declaredKind(null)).toBeUndefined();
		expect(declaredKind({})).toBeUndefined();
		expect(declaredKind({ metadata: "not-an-object" })).toBeUndefined();
		expect(declaredKind({ metadata: { kind: "bogus" } })).toBeUndefined();
	});
});

describe("detectKind", () => {
	it("prefers an explicit declaration over any signal", () => {
		const kind = detectKind({
			data: { metadata: { kind: "reference" } },
			orderedListCount: 5,
			referenceFileCount: 0,
			linksToOtherSkills: true,
		});
		expect(kind).toBe("reference");
	});

	it("detects procedural from disable-model-invocation + ordered steps", () => {
		const kind = detectKind({
			data: { "disable-model-invocation": true },
			orderedListCount: 1,
			referenceFileCount: 0,
			linksToOtherSkills: false,
		});
		expect(kind).toBe("procedural");
	});

	it("detects tool-wrapper from a populated allowed-tools", () => {
		const kind = detectKind({
			data: { "allowed-tools": ["Bash", "Read"] },
			orderedListCount: 0,
			referenceFileCount: 0,
			linksToOtherSkills: false,
		});
		expect(kind).toBe("tool-wrapper");
	});

	it("detects multi-domain from several reference files", () => {
		const kind = detectKind({
			data: {},
			orderedListCount: 0,
			referenceFileCount: 3,
			linksToOtherSkills: false,
		});
		expect(kind).toBe("multi-domain");
	});

	it("detects meta from links to other skills", () => {
		const kind = detectKind({
			data: {},
			orderedListCount: 0,
			referenceFileCount: 0,
			linksToOtherSkills: true,
		});
		expect(kind).toBe("meta");
	});

	it("returns undefined when no signal is present", () => {
		const kind = detectKind({
			data: {},
			orderedListCount: 0,
			referenceFileCount: 0,
			linksToOtherSkills: false,
		});
		expect(kind).toBeUndefined();
	});
});
