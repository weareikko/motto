/**
 * Eval worker setup: load `.env` inside each Vitest worker so credential-gated
 * `skipIf`/detect() checks see the vars at module-evaluation time. Mirrors the
 * gitlab-review eval setup. No-op if `.env` is absent.
 */

import { config as loadDotenv } from "dotenv";

loadDotenv();
