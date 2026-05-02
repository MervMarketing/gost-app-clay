/**
 * Client for the Merv CLG live scan: POST same-origin `/api/clg-snapshot` with `{ url }`.
 * Production uses the built-in engine when `ANTHROPIC_API_KEY` is set on Vercel; otherwise may proxy to `CLG_SNAPSHOT_URL`.
 * JSON shape matches `api/lib/mervSnapshotEngine` (server) and `positioning-scoring-rubric-v1.md`.
 */

import type { CLGAuditInput, CLGAuditResult } from '@/types/gost';
import {
  buildDraftAuditInput,
  getContextRecommendations,
  getScoreBand,
  nearestFivePoints,
  tagRecommendation,
} from '@/lib/clgAudit';

export interface MervScanIssue {
  phrase_id: number | null;
  dimension: 'A' | 'B' | 'C' | 'D';
  what_we_found: string;
  why_it_hurts: string;
  how_to_fix: string;
}

export interface MervScanDimensionScores {
  clarity: {
    score: number;
    max: 30;
    a1: number;
    a2: number;
    a3: number;
  };
  positioning: {
    score: number;
    max: 30;
    phrases_detected: number[];
  };
  structure: {
    score: number;
    max: 20;
    sections_present: string[];
  };
  conversion: {
    score: number;
    max: 20;
    d1: number;
    d2: number;
    d3: number;
    d4: number;
  };
}

export interface MervScanResult {
  overall_score: number;
  dimension_scores: MervScanDimensionScores;
  headline_quote: string;
  top_issues: MervScanIssue[];
  leaky_funnel_headline: string;
  scanned_url?: string;
  scanned_at?: string;
}

function parseLeakFromHeadline(headline: string): number | null {
  const m = headline.match(/~\s*(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/** Snapshot returns `closing_cta`; GOST weights use `closingCta`. */
function normalizeStructureSection(id: string): string {
  if (id === 'closing_cta') return 'closingCta';
  return id;
}

export function getSnapshotScanUrl(apiBaseUrl: string): string {
  const trimmed = apiBaseUrl.replace(/\/$/, '');
  if (trimmed.endsWith('/api/scan')) return trimmed;
  return `${trimmed}/api/scan`;
}

/**
 * @param homepageUrl URL to scan
 * @param devDirectBase Local dev only: external Snapshot base (`VITE_CLG_SNAPSHOT_URL`). Otherwise POSTs to `/api/clg-snapshot` (needs `vercel dev` + `ANTHROPIC_API_KEY`, or Vercel prod env).
 */
export async function fetchMervSnapshotScan(
  homepageUrl: string,
  devDirectBase?: string,
): Promise<MervScanResult> {
  const useDevDirect = Boolean(import.meta.env.DEV && devDirectBase?.trim());
  const scanUrl = useDevDirect ? getSnapshotScanUrl(devDirectBase!.trim()) : '/api/clg-snapshot';

  const res = await fetch(scanUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ url: homepageUrl }),
  });
  const raw = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch {
    const snippet = raw.replace(/\s+/g, ' ').trim().slice(0, 280);
    throw new Error(
      `Live scan response was not JSON (${res.status}). ${snippet || 'Empty body'} — check Vercel function logs for /api/clg-snapshot.`,
    );
  }
  if (!res.ok) {
    const err = data as { error?: string; detail?: string; hint?: string };
    const parts = [err.error, err.detail, err.hint].filter(Boolean);
    throw new Error(parts.length > 0 ? parts.join(' — ') : `Snapshot request failed (${res.status})`);
  }
  return data as MervScanResult;
}

export function scanResultToCLGAuditResult(
  scan: MervScanResult,
  contextInput: Pick<CLGAuditInput, 'companyName' | 'homepageUrl' | 'stage' | 'companyType' | 'salesModel'>,
): CLGAuditResult {
  const clarity = scan.dimension_scores.clarity.score;
  const positioning = scan.dimension_scores.positioning.score;
  const structure = scan.dimension_scores.structure.score;
  const conversion = scan.dimension_scores.conversion.score;
  const total = scan.overall_score;
  const leakEstimate = parseLeakFromHeadline(scan.leaky_funnel_headline) ?? nearestFivePoints(100 - total);
  const band = getScoreBand(total);

  const conv = scan.dimension_scores.conversion;
  const input: CLGAuditInput = {
    ...buildDraftAuditInput(contextInput),
    whatIsIt: scan.dimension_scores.clarity.a1,
    whoIsItFor: scan.dimension_scores.clarity.a2,
    whyBetter: scan.dimension_scores.clarity.a3,
    founderPhrases: [],
    sectionsPresent: scan.dimension_scores.structure.sections_present.map(normalizeStructureSection),
    conversionSignals: {
      ctaSpecific: conv.d1 >= 3,
      socialProofCredible: conv.d2 >= 3,
      outcomesFocused: conv.d3 >= 3,
      customerLanguage: conv.d4 >= 3,
    },
    quoteEvidence: scan.top_issues.map((i) => i.what_we_found).slice(0, 3),
    notes: [
      `Source: Merv CLG Snapshot (rubric v1). Hero: ${scan.headline_quote || '—'}`,
      `Founder phrase pattern IDs: ${scan.dimension_scores.positioning.phrases_detected.join(', ') || 'none'}`,
    ].join('\n'),
  };

  const topIssues = scan.top_issues.slice(0, 3).map((issue) => ({
    quote: issue.what_we_found,
    diagnosis: issue.why_it_hurts,
    fix: issue.how_to_fix,
    phraseId: issue.phrase_id,
    dimension: issue.dimension,
  }));

  const recommendations = [...scan.top_issues.map((i) => i.how_to_fix), ...getContextRecommendations(input)];
  const taggedRecommendations = recommendations.slice(0, 8).map(tagRecommendation);

  return {
    runAt: scan.scanned_at || new Date().toISOString(),
    source: 'merv-snapshot',
    input,
    score: { total, clarity, positioning, structure, conversion },
    leakEstimate,
    band,
    topIssues,
    recommendations: recommendations.slice(0, 8),
    taggedRecommendations: taggedRecommendations.slice(0, 8),
    snapshotMeta: {
      headlineQuote: scan.headline_quote,
      leakyFunnelHeadline: scan.leaky_funnel_headline,
      scannedUrl: scan.scanned_url || contextInput.homepageUrl,
      scannedAt: scan.scanned_at,
    },
  };
}
