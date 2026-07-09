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
