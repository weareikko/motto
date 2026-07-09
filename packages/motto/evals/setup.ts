/**
 * Eval worker setup: load the monorepo-root `.env` inside each Vitest worker so
 * credential-gated `detect()`/availability checks see the vars at
 * module-evaluation time. No-op if `.env` is absent.
 */

import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });
