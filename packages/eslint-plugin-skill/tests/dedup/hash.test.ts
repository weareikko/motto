import { describe, expect, it } from "vitest";

import { hashContent, normalize, similarity } from "../../src/dedup/hash";

describe("normalize", () => {
	it("collapses CRLF, trailing whitespace, and extra blank lines", () => {
		const a = "# Title\r\n\r\nBody line.   \r\n\r\n\r\n\r\nMore.\r\n";
		const b = "# Title\n\nBody line.\n\nMore.";
		expect(normalize(a)).toBe(normalize(b));
	});
});

describe("hashContent", () => {
	it("is stable across incidental formatting differences", () => {
		const a = "# Title\n\nBody.\n";
		const b = "# Title\r\n\r\nBody.   \r\n";
		expect(hashContent(a)).toBe(hashContent(b));
	});

	it("differs when content actually differs", () => {
		expect(hashContent("# A\n")).not.toBe(hashContent("# B\n"));
	});
});

describe("similarity", () => {
	it("is 1 for identical text", () => {
		expect(similarity("one two three four five six", "one two three four five six")).toBe(1);
	});

	it("is 0 for completely unrelated short text", () => {
		expect(similarity("Only skill-a has this file.", "Only skill-b has this file.")).toBe(0);
	});

	it("is high for a paraphrase that shares most of its content", () => {
		const a =
			"When resolving the reporting window, always exclude the current day because later events lag earlier ones.";
		const b =
			"When resolving the reporting window, always exclude the current day because later events lag behind.";
		expect(similarity(a, b)).toBeGreaterThan(0.5);
	});
});
