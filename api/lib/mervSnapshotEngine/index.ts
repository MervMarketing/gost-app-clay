/**
 * Merv CLG homepage scan engine (Node-only).
 *
 * **GOST:** Lives under `api/lib/` so Vercel bundles it with `api/clg-snapshot`. `ANTHROPIC_API_KEY` enables inline scans.
 *
 * **Reuse on mervmarketing.com later:** (pick one)
 * - Deploy a thin API route (Next/Node) that imports `runMervHomepageScan` from a **shared package**
 *   or copy this folder into that repo; or
 * - POST to the same GOST endpoint from the marketing site (lead magnet → your API URL).
 *
 * Do **not** import this module from React client code (bundle size + secret leakage risk).
 */

export { CLAUDE_SCAN_MODEL, SCORING_SYSTEM_PROMPT } from './scoringPrompt';
export type { MervEngineScanIssue, MervEngineDimensionScores, MervEngineScanResult } from './types';
export { normalizeHomepageUrl, runMervHomepageScan, ScanHttpError } from './runScan';
