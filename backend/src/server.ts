import dotenv from 'dotenv';
dotenv.config({ override: true });

// ── Startup Validation ─────────────────────────────────────────────────────────

// Critical env vars — fail fast if missing
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[FATAL] Required environment variable ${key} is not set. Exiting.`);
    process.exit(1);
  }
}

// Warn if JWT secrets are too short
if (process.env.JWT_SECRET!.length < 32 || process.env.JWT_REFRESH_SECRET!.length < 32) {
  console.warn('[SECURITY WARNING] JWT secrets should be at least 32 characters for adequate security.');
}

const ghToken = process.env.GITHUB_MODELS_TOKEN || process.env.GITHUB_TOKEN;
if (!ghToken) {
  console.warn('[WARN] GITHUB_MODELS_TOKEN is not set. AI Analytics will use local fallback only.');
}

import { createApp } from './app.js';
import { startMidnightAuditor } from './jobs/midnightAuditor.js';

const PORT = process.env.PORT ?? 5000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(ghToken
    ? `[AI Analytics] GitHub Models token detected — AI endpoint active.`
    : `[AI Analytics] No GitHub token — local analysis only.`
  );

  // Start automated nightly risk scanner
  startMidnightAuditor();
});
