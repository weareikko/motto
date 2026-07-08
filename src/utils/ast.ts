/**
 * Tiny mdast traversal helpers.
 *
 * Rules use a single `root(node)` visitor and walk from there, which keeps them
 * independent of visitor ordering and free of `:exit`/esquery selectors — the
 * subset that ports directly to oxlint's JS plugin runtime.
 */

import type { Nodes, Root, Yaml } from "mdast";

/**
 * The frontmatter `yaml` node, if present as a direct child of root.
 */
export function findFrontmatter(root: Root): Yaml | undefined {
	return root.children.find((child): child is Yaml => child.type === "yaml");
}

/**
 * All nodes of a given type anywhere in the tree, in document order.
 */
export function collect<T extends Nodes = Nodes>(
	node: Nodes,
	type: T["type"],
): T[] {
	const out: T[] = [];
	const walk = (current: Nodes): void => {
		if (current.type === type) {
			out.push(current as T);
		}
		if ("children" in current) {
			for (const child of current.children) {
				walk(child as Nodes);
			}
		}
	};
	walk(node);
	return out;
}

/**
 * Concatenated text content of a node's subtree.
 */
export function textContent(node: Nodes): string {
	if ("value" in node && typeof node.value === "string") {
		return node.value;
	}
	if ("children" in node) {
		return node.children.map((child) => textContent(child as Nodes)).join("");
	}
	return "";
}
