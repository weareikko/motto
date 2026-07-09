/**
 * Shared helpers for harness adapters: binary detection and headless exec.
 */

import { execFile } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 120_000;

/** Whether `bin` resolves on PATH. */
export function onPath(bin: string): Promise<boolean> {
	return new Promise((resolve) => {
		// Pass `bin` as a positional arg ($1) rather than interpolating it into
		// the script, so no shell metacharacters in `bin` can be executed.
		execFile(
			"sh",
			["-c", 'command -v "$1" >/dev/null 2>&1', "sh", bin],
			(err) => resolve(!err),
		);
	});
}

export interface ExecResult {
	stdout: string;
	stderr: string;
	code: number | null;
}

/** Run a binary with args, capturing stdout/stderr; never rejects. */
export function runBin(
	bin: string,
	args: string[],
	opts: { cwd?: string; timeoutMs?: number; env?: NodeJS.ProcessEnv } = {},
): Promise<ExecResult> {
	return new Promise((resolve) => {
		execFile(
			bin,
			args,
			{
				cwd: opts.cwd,
				timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
				maxBuffer: 32 * 1024 * 1024,
				env: opts.env ?? process.env,
			},
			(err, stdout, stderr) => {
				resolve({
					stdout: stdout?.toString() ?? "",
					stderr: stderr?.toString() ?? "",
					code: err && typeof (err as { code?: number }).code === "number"
						? (err as { code: number }).code
						: err
							? 1
							: 0,
				});
			},
		);
	});
}

/** Present iff at least one of the named env vars is non-empty. */
export function hasAnyEnv(...names: string[]): string | undefined {
	return names.find((n) => (process.env[n] ?? "").trim() !== "");
}
