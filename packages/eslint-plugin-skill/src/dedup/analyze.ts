/**
 * Cross-skill reference de-duplication analysis.
 *
 * ESLint (and oxlint) rules see one file at a time, so they cannot reliably
 * detect that two DIFFERENT skills carry duplicated or drifted copies of the
 * same reference content — that is a repo/collection-level analysis. This
 * module implements it directly: group sibling skills into a comparison
 * scope, hash their `references/**​/*.md` files, and classify:
 *
 * - byte-identical content across skills → `duplicate` (maintenance burden)
 * - same filename, different content across skills → `divergence` (the
 *   copies forked — a silent correctness hazard, since a fix to one will not
 *   reach the other)
 * - (opt-in) different filenames, highly similar content → `near-duplicate`
 *   (a possible copy that was renamed instead of shared)
 */

import { resolve } from "node:path";

import { findSkillDirs, referenceFilesFor, scopeKeyFor } from "./discover";
import { similarity } from "./hash";
import type {
	AnalyzeOptions,
	AnalyzeResult,
	DivergenceFinding,
	DuplicateFinding,
	NearDuplicateFinding,
	ReferenceFile,
} from "./types";

const DEFAULT_NEAR_DUPLICATE_THRESHOLD = 0.75;

export function analyzeReferences(
	root: string,
	options: AnalyzeOptions = {},
): AnalyzeResult {
	const absRoot = resolve(root);
	const scopeStrategy = options.scope ?? "plugin";
	const ignore = new Set(options.ignoreRelPaths ?? []);

	const skillDirs = findSkillDirs(absRoot);
	const scopes = new Map<string, ReferenceFile[]>();
	for (const skillDir of skillDirs) {
		const scope = scopeStrategy === "repo" ? absRoot : scopeKeyFor(skillDir, absRoot);
		const files = referenceFilesFor(skillDir).filter(
			(f) => !ignore.has(f.relPath),
		);
		if (files.length === 0) {
			continue;
		}
		const bucket = scopes.get(scope) ?? [];
		bucket.push(...files);
		scopes.set(scope, bucket);
	}

	const duplicates: DuplicateFinding[] = [];
	const divergences: DivergenceFinding[] = [];
	const nearDuplicates: NearDuplicateFinding[] = [];

	for (const [scope, files] of scopes) {
		// Group by relPath (filename within references/) to find same-name
		// files, then split each group by hash.
		const byRelPath = new Map<string, ReferenceFile[]>();
		for (const file of files) {
			const bucket = byRelPath.get(file.relPath) ?? [];
			bucket.push(file);
			byRelPath.set(file.relPath, bucket);
		}

		for (const [relPath, group] of byRelPath) {
			const distinctSkills = new Set(group.map((f) => f.skillName));
			if (distinctSkills.size < 2) {
				continue; // Only one skill has this filename — nothing to compare.
			}

			const byHash = new Map<string, ReferenceFile[]>();
			for (const file of group) {
				const bucket = byHash.get(file.hash) ?? [];
				bucket.push(file);
				byHash.set(file.hash, bucket);
			}

			if (byHash.size === 1) {
				// Every skill's copy of this filename is byte-identical.
				const [hash] = byHash.keys();
				duplicates.push({
					type: "duplicate",
					severity: "warn",
					scope,
					relPath,
					hash,
					files: group.map((f) => ({
						skillName: f.skillName,
						absPath: f.absPath,
					})),
				});
			} else {
				// Same filename, but content diverged across skills.
				divergences.push({
					type: "divergence",
					severity: "error",
					scope,
					relPath,
					groups: [...byHash.entries()].map(([hash, hashFiles]) => ({
						hash,
						files: hashFiles.map((f) => ({
							skillName: f.skillName,
							absPath: f.absPath,
						})),
					})),
				});
			}
		}

		if (options.nearDuplicates) {
			const threshold =
				options.nearDuplicateThreshold ?? DEFAULT_NEAR_DUPLICATE_THRESHOLD;
			const alreadyPaired = new Set<string>();
			for (const finding of [...duplicates, ...divergences]) {
				if (finding.scope === scope) {
					alreadyPaired.add(finding.relPath);
				}
			}

			for (let i = 0; i < files.length; i++) {
				for (let j = i + 1; j < files.length; j++) {
					const a = files[i];
					const b = files[j];
					if (
						a.skillName === b.skillName ||
						a.relPath === b.relPath ||
						alreadyPaired.has(a.relPath) ||
						alreadyPaired.has(b.relPath)
					) {
						continue;
					}
					const score = similarity(a.raw, b.raw);
					if (score >= threshold) {
						nearDuplicates.push({
							type: "near-duplicate",
							severity: "warn",
							scope,
							fileA: {
								skillName: a.skillName,
								absPath: a.absPath,
								relPath: a.relPath,
							},
							fileB: {
								skillName: b.skillName,
								absPath: b.absPath,
								relPath: b.relPath,
							},
							similarity: score,
						});
					}
				}
			}
		}
	}

	return { duplicates, divergences, nearDuplicates };
}
