import { config as loadDotenv } from "dotenv";
import { defineConfig } from "vitest/config";

// Load `.env` in the config process too, so top-level availability checks in
// the eval files (which decide which suites to register) see the credentials.
loadDotenv();

// Separate config for evals so they never run under the default `npm test`
// (unit RuleTester specs). Evals call real agent CLIs and cost money — they
// are opt-in via RUN_EVALS=1 and self-skip when a harness/credential is absent.
//
//   RUN_EVALS=1 npx vitest run --config vite.eval.config.ts
export default defineConfig({
	test: {
		include: ["evals/**/*.eval.ts"],
		environment: "node",
		// Also load `.env` inside each worker process.
		setupFiles: ["evals/setup.ts"],
		// Agent runs are slow; give them room.
		testTimeout: 600_000,
		hookTimeout: 60_000,
		// Run serially — parallel agent CLIs would contend for the same
		// credentials/rate limits.
		fileParallelism: false,
	},
});
