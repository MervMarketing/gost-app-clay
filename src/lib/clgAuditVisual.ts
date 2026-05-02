import type { CLGAuditIssue, CLGAuditResult, CLGRecommendation } from '@/types/gost';

/**
 * Full-page preview via third-party render (no auth). Can be blocked or rate-limited — not guaranteed.
 * Prefer `snapshotMeta.previewImageUrl` from Live scan (og:image from your own HTML fetch).
 */
export function homepagePreviewImageUrl(homepageUrl: string): string | null {
  const raw = homepageUrl.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw.includes('://') ? raw : `https://${raw}`);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return `https://image.thum.io/get/width/960/crop/2800/noanimate/${encodeURIComponent(u.toString())}`;
  } catch {
    return null;
  }
}

export type RubricDimension = 'A' | 'B' | 'C' | 'D';

export const RUBRIC_DIMENSION_UI: Record<
  RubricDimension,
  { label: string; short: string; chipClass: string; railClass: string }
> = {
  A: {
    label: 'Clarity',
    short: 'What it is · for whom · why you',
    chipClass: 'bg-violet-500/15 text-violet-800 dark:text-violet-200 border-violet-400/50',
    railClass: 'border-l-4 border-violet-500',
  },
  B: {
    label: 'Positioning',
    short: 'Persona · category · differentiation',
    chipClass: 'bg-amber-400/20 text-amber-950 dark:text-amber-100 border-amber-500/50',
    railClass: 'border-l-4 border-amber-500',
  },
  C: {
    label: 'Structure',
    short: 'Sections · proof · paths',
    chipClass: 'bg-orange-400/20 text-orange-950 dark:text-orange-100 border-orange-500/50',
    railClass: 'border-l-4 border-orange-500',
  },
  D: {
    label: 'Conversion',
    short: 'CTA · proof · outcomes',
    chipClass: 'bg-sky-500/15 text-sky-900 dark:text-sky-100 border-sky-500/50',
    railClass: 'border-l-4 border-sky-500',
  },
};

export function dimensionFromIssue(issue: CLGAuditIssue): RubricDimension | null {
  const d = issue.dimension;
  if (d === 'A' || d === 'B' || d === 'C' || d === 'D') return d;
  return null;
}

/** Stable pseudo-random layout slot for sticky notes (0–1). */
export function stickySlot(seed: string, index: number): { top: number; left: number; rotate: number } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const a = (h + index * 997) % 1000;
  const b = (h + index * 733) % 1000;
  const top = 6 + (a % 52);
  const left = 4 + (b % 48);
  const rotate = -3 + ((h + index) % 7);
  return { top, left, rotate };
}

export function buildCriteriaRailItems(result: CLGAuditResult): { dimension: RubricDimension; hint: string }[] {
  const dims = new Set<RubricDimension>();
  result.topIssues.forEach((issue) => {
    const d = dimensionFromIssue(issue);
    if (d) dims.add(d);
  });
  if (dims.size === 0) {
    (['A', 'B', 'C', 'D'] as RubricDimension[]).forEach((d) => dims.add(d));
  }
  const order: RubricDimension[] = ['A', 'B', 'C', 'D'];
  return order.filter((d) => dims.has(d)).map((dimension) => ({
    dimension,
    hint: RUBRIC_DIMENSION_UI[dimension].short,
  }));
}

export function truncateNote(s: string, max = 96): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function partitionRecommendationsForRail(
  recs: CLGRecommendation[],
): { benefits: string[]; context: string[] } {
  const benefits = recs.slice(0, 4).map((r) => truncateNote(r.text, 72));
  const context =
    recs.length > 4 ? recs.slice(4, 7).map((r) => truncateNote(r.text, 64)) : [];
  return { benefits, context };
}
