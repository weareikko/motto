/**
 * @ikko-dev/motto — skill-eval tooling.
 *
 * Public library surface (the `motto` CLI is added in Phase B). Re-exports the
 * multi-harness runner, harness adapters, judge, and config so evals and future
 * commands build on one entry point.
 */

export * from "./harness/index";
export * from "./runner";
export * from "./config";
export { judge, judgeAvailable, type JudgeVerdict } from "./judge/llm-judge";

// Skill eval surface (Phase B).
export * from "./skill/parse";
export * from "./skill/contract";
export * from "./metrics/cost";
export * from "./metrics/behavioral";
export * from "./report";

// Statistics (CI-based reliability banding) + the MCP server surface.
export * from "./stats/index";
export { createMottoServer, startStdio } from "./mcp/server";

// Behavioral priors + the programmatic Pi driver + router-mode trigger fidelity.
export * from "./priors/index";
export * from "./harness/pi-agent";
export * from "./trigger/router";
