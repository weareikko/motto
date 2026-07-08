/**
 * Helpers for working with links and images in a skill body.
 */

import type { Image, Link, Root } from "mdast";

import { collect } from "./ast";

export interface LinkTarget {
	url: string;
	kind: "link" | "image";
	node: Link | Image;
}

/**
 * Whether a URL points at a repo-relative path (not an anchor, scheme, or
 * protocol-relative URL).
 */
export function isRelativeUrl(url: string): boolean {
	if (!url || url.startsWith("#")) {
		return false;
	}
	if (url.startsWith("//") || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
		return false;
	}
	return true;
}

/**
 * Strip a URL's fragment and query so it can be resolved to a filesystem path.
 */
export function urlToPath(url: string): string {
	let path = url;
	const hash = path.indexOf("#");
	if (hash !== -1) {
		path = path.slice(0, hash);
	}
	const query = path.indexOf("?");
	if (query !== -1) {
		path = path.slice(0, query);
	}
	try {
		return decodeURIComponent(path);
	} catch {
		return path;
	}
}

/**
 * All link and image targets in the tree, in document order.
 */
export function collectLinkTargets(root: Root): LinkTarget[] {
	return [
		...collect<Link>(root, "link").map(
			(node): LinkTarget => ({ url: node.url, kind: "link", node }),
		),
		...collect<Image>(root, "image").map(
			(node): LinkTarget => ({ url: node.url, kind: "image", node }),
		),
	];
}
