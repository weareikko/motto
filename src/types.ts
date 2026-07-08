/**
 * Shared types for the plugin's rules.
 */

/** A 1-based source position (line/column). */
export interface Point {
	line: number;
	column: number;
	offset?: number;
}

/** A source range, compatible with mdast/unist `Position`. */
export interface SourceRange {
	start: Point;
	end: Point;
}
