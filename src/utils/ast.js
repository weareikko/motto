/**
 * Tiny mdast traversal helpers.
 *
 * Rules use a single `root(node)` visitor and walk from there, which keeps them
 * independent of visitor ordering and free of `:exit`/esquery selectors — the
 * subset that ports directly to oxlint's JS plugin runtime.
 */

/**
 * The frontmatter `yaml` node, if present as a direct child of root.
 *
 * @param {import("mdast").Root} root
 * @returns {import("mdast").Yaml | undefined}
 */
export function findFrontmatter(root) {
	return (root.children || []).find(child => child.type === "yaml");
}

/**
 * All nodes of a given type anywhere in the tree, in document order.
 *
 * @param {import("mdast").Node} node
 * @param {string} type
 * @returns {import("mdast").Node[]}
 */
export function collect(node, type) {
	const out = [];
	(function walk(current) {
		if (!current) {
			return;
		}
		if (current.type === type) {
			out.push(current);
		}
		for (const child of current.children || []) {
			walk(child);
		}
	})(node);
	return out;
}

/**
 * Concatenated text content of a node's subtree.
 *
 * @param {import("mdast").Node} node
 * @returns {string}
 */
export function textContent(node) {
	if (!node) {
		return "";
	}
	if (typeof node.value === "string") {
		return node.value;
	}
	return (node.children || []).map(textContent).join("");
}
