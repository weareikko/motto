/**
 * Content normalization and hashing for cross-skill reference comparison.
 */

import { createHash } from "node:crypto";

/**
 * Normalize markdown content so incidental formatting differences (line
 * endings, trailing whitespace, a stray blank line) don't defeat
 * identical-content detection.
 */
export function normalize(content: string): string {
	return content
		.replace(/\r\n/g, "\n")
		.split("\n")
		.map((line) => line.replace(/\s+$/, ""))
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

/** SHA-1 hash of the normalized content. */
export function hashContent(content: string): string {
	return createHash("sha1").update(normalize(content)).digest("hex");
}

/**
 * Word-shingle Jaccard similarity between two texts, for near-duplicate
 * detection. Returns a value in [0, 1].
 */
export function similarity(a: string, b: string, shingleSize = 5): number {
	const shinglesOf = (text: string): Set<string> => {
		const words = normalize(text).toLowerCase().split(/\s+/).filter(Boolean);
		const shingles = new Set<string>();
		for (let i = 0; i <= words.length - shingleSize; i++) {
			shingles.add(words.slice(i, i + shingleSize).join(" "));
		}
		return shingles;
	};

	const setA = shinglesOf(a);
	const setB = shinglesOf(b);
	if (setA.size === 0 || setB.size === 0) {
		return 0;
	}
	let intersection = 0;
	for (const shingle of setA) {
		if (setB.has(shingle)) {
			intersection++;
		}
	}
	const union = setA.size + setB.size - intersection;
	return union === 0 ? 0 : intersection / union;
}
