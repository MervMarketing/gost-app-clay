/**
 * Merv CLG homepage scan engine (Node-only).
 *
 * **GOST:** `api/clg-snapshot` calls `runMervHomepageScan` when `ANTHROPIC_API_KEY` is set.
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
