/**
 * Reverse funnel — visitor requirement math (see docs/reverse-funnel-tool-spec.md).
 * Pure functions only; safe to unit test.
 */

import type { GOSTData, Objective } from '@/types/gost';

export const REVERSE_FUNNEL_STORAGE_KEY = 'gost-reverse-funnel-inputs-v1';

export type ChannelId = 'referrals' | 'linkedin' | 'outbound' | 'content' | 'paid';

export interface ChannelDef {
  id: ChannelId;
  label: string;
  defaultPct: number;
  capLow: number;
  capHigh: number;
  ceilingNote: string;
}

export const CHANNEL_DEFS: ChannelDef[] = [
  {
    id: 'referrals',
    label: 'Warm referrals',
    defaultPct: 20,
    capLow: 30,
    capHigh: 50,
    ceilingNote: 'Organic ceiling ~30–50/mo (network-limited)',
  },
  {
    id: 'linkedin',
    label: 'Founder LinkedIn (organic)',
    defaultPct: 30,
    capLow: 100,
    capHigh: 200,
    ceilingNote: 'Often ~100–200/mo after 8–12 weeks of consistency',
  },
  {
    id: 'outbound',
    label: 'Cold outbound',
    defaultPct: 30,
    capLow: 30,
    capHigh: 60,
    ceilingNote: 'Roughly ~30–60 qualified touches/mo at sustainable pace',
  },
  {
    id: 'content',
    label: 'Content / SEO inbound',
    defaultPct: 10,
    capLow: 50,
    capHigh: 150,
    ceilingNote: '~50–150/mo after 3–6 months compounding',
  },
  {
    id: 'paid',
    label: 'Paid ads',
    defaultPct: 10,
    capLow: 200,
    capHigh: 800,
    ceilingNote: 'Illustrative organic-style cap for math; paid can scale higher',
  },
];

export const DEFAULT_TOOLTIPS = {
  closeRate:
    'Industry midpoint for B2B services. Range: 15–40% by sector. Source: aggregated CRM benchmark studies.',
  leadToQual:
    'Industry midpoint. Varies 20–40% by lead source quality. Source: HubSpot sales benchmarks.',
  visitorToLead:
    'Lower bound of HubSpot B2B benchmark range (1.5–3%). Source: HubSpot marketing statistics.',
  bounce:
    'Midpoint for top-of-funnel B2B pages (range ~60–80%). Source: typical GA4 cohort patterns.',
  audience:
    'Merv-grade estimate landing in the middle of published Demandbase pain-point research—not a single cited percentage.',
  compression:
    'Illustrative shifts assuming sharpened positioning + ICP. Real-world deltas vary widely. Use this to model the shape of the math, not as a forecast.',
} as const;

export interface ReverseFunnelInputs {
  revenuePerMonth: number;
  lifetimeMonths: number;
  clientCount: number;
  closeRatePct: number;
  leadToQualPct: number;
  visitorToLeadPct: number;
  bouncePct: number;
  audienceEfficiencyPct: number;
  channelPcts: Record<ChannelId, number>;
}

export const defaultReverseFunnelInputs = (): ReverseFunnelInputs => ({
  revenuePerMonth: 3000,
  lifetimeMonths: 12,
  clientCount: 1,
  closeRatePct: 25,
  leadToQualPct: 25,
  visitorToLeadPct: 1.5,
  bouncePct: 60,
  audienceEfficiencyPct: 40,
  channelPcts: Object.fromEntries(CHANNEL_DEFS.map((c) => [c.id, c.defaultPct])) as Record<ChannelId, number>,
});

export interface CascadeRow {
  label: string;
  rateLabel: string;
  count: number;
}

export interface ReverseFunnelResult {
  totalLtv: number;
  closesNeeded: number;
  cascade: CascadeRow[];
  totalVisitors: number;
  totalVisitorsSharp: number;
  compressionFactor: number;
  monthsRangeAtChannels: { low: number; high: number };
  monthsRangeAtChannelsSharp: { low: number; high: number };
  sharpRates: {
    visitorToLeadPct: number;
    bouncePct: number;
    audienceEfficiencyPct: number;
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function pctToDecimal(p: number): number {
  return clamp(p, 0, 100) / 100;
}

/** Working backwards from goal to visitors (spec formulas). */
export function computeVisitorsNeeded(
  N: number,
  cClose: number,
  cQual: number,
  cLead: number,
  bBounce: number,
  aMatch: number,
): number {
  if (N <= 0 || cClose <= 0 || cQual <= 0 || cLead <= 0 || aMatch <= 0) return Infinity;
  const bounce = clamp(bBounce, 0, 0.999);
  const denom = 1 - bounce;
  if (denom <= 0) return Infinity;

  const qualifiedOppsNeeded = N / cClose;
  const leadsNeeded = qualifiedOppsNeeded / cQual;
  const engagedVisitors = leadsNeeded / cLead;
  const rightFitVisitors = engagedVisitors / denom;
  const totalVisitors = rightFitVisitors / aMatch;
  return Number.isFinite(totalVisitors) ? totalVisitors : Infinity;
}

export function buildCascade(
  N: number,
  cClose: number,
  cQual: number,
  cLead: number,
  bBounce: number,
  aMatch: number,
  totalVisitors: number,
): CascadeRow[] {
  const qualifiedOppsNeeded = N / cClose;
  const leadsNeeded = qualifiedOppsNeeded / cQual;
  const engagedVisitors = leadsNeeded / cLead;
  const rightFitVisitors = engagedVisitors / (1 - clamp(bBounce, 0, 0.999));

  return [
    { label: 'Clients to land', rateLabel: 'goal', count: N },
    {
      label: 'Qualified opportunities',
      rateLabel: `@ ${(cClose * 100).toFixed(0)}% close`,
      count: qualifiedOppsNeeded,
    },
    {
      label: 'Leads',
      rateLabel: `@ ${(cQual * 100).toFixed(0)}% lead → qualified`,
      count: leadsNeeded,
    },
    {
      label: 'Engaged visitors (post-bounce)',
      rateLabel: `@ ${(cLead * 100).toFixed(2)}% visitor → lead`,
      count: engagedVisitors,
    },
    {
      label: 'Right-fit visitors',
      rateLabel: `@ ${((1 - clamp(bBounce, 0, 0.999)) * 100).toFixed(0)}% not bounced`,
      count: rightFitVisitors,
    },
    {
      label: 'Total visitors (top of funnel)',
      rateLabel: `@ ${(aMatch * 100).toFixed(0)}% audience match`,
      count: totalVisitors,
    },
  ];
}

function sumChannelThroughput(
  channelPcts: Record<ChannelId, number>,
  capPick: 'low' | 'high',
): number {
  let sum = 0;
  for (const def of CHANNEL_DEFS) {
    const w = clamp(channelPcts[def.id] ?? 0, 0, 100) / 100;
    const cap = capPick === 'low' ? def.capLow : def.capHigh;
    sum += w * cap;
  }
  return sum;
}

export function computeReverseFunnel(inputs: ReverseFunnelInputs): ReverseFunnelResult | null {
  const R = clamp(inputs.revenuePerMonth, 100, 100_000);
  const M = clamp(Math.round(inputs.lifetimeMonths), 1, 60);
  const N = clamp(Math.round(inputs.clientCount), 1, 100);

  const cClose = pctToDecimal(inputs.closeRatePct);
  const cQual = pctToDecimal(inputs.leadToQualPct);
  const cLead = pctToDecimal(inputs.visitorToLeadPct);
  const bBounce = pctToDecimal(inputs.bouncePct);
  const aMatch = pctToDecimal(inputs.audienceEfficiencyPct);

  if (cClose <= 0 || cQual <= 0 || cLead <= 0 || aMatch <= 0) return null;

  const totalLtv = R * M * N;
  const closesNeeded = N;

  const totalVisitors = computeVisitorsNeeded(N, cClose, cQual, cLead, bBounce, aMatch);
  if (!Number.isFinite(totalVisitors)) return null;

  const cLeadSharp = clamp(cLead * 2.0, 0.001, 0.99);
  const bBounceSharp = clamp(bBounce * 0.55, 0, 0.95);
  const aMatchSharp = clamp(aMatch * 1.65, 0.01, 0.99);

  const totalVisitorsSharp = computeVisitorsNeeded(N, cClose, cQual, cLeadSharp, bBounceSharp, aMatchSharp);
  if (!Number.isFinite(totalVisitorsSharp) || totalVisitorsSharp <= 0) return null;

  const compressionFactor = totalVisitors / totalVisitorsSharp;

  const throughputLow = sumChannelThroughput(inputs.channelPcts, 'low');
  const throughputHigh = sumChannelThroughput(inputs.channelPcts, 'high');

  const monthsLow = throughputHigh > 0 ? totalVisitors / throughputHigh : Infinity;
  const monthsHigh = throughputLow > 0 ? totalVisitors / throughputLow : Infinity;

  const sLow = sumChannelThroughput(inputs.channelPcts, 'low');
  const sHigh = sumChannelThroughput(inputs.channelPcts, 'high');
  const monthsSharpLow = sHigh > 0 ? totalVisitorsSharp / sHigh : Infinity;
  const monthsSharpHigh = sLow > 0 ? totalVisitorsSharp / sLow : Infinity;

  const cascade = buildCascade(N, cClose, cQual, cLead, bBounce, aMatch, totalVisitors);

  return {
    totalLtv,
    closesNeeded,
    cascade,
    totalVisitors,
    totalVisitorsSharp,
    compressionFactor,
    monthsRangeAtChannels: {
      low: Math.min(monthsLow, monthsHigh),
      high: Math.max(monthsLow, monthsHigh),
    },
    monthsRangeAtChannelsSharp: {
      low: Math.min(monthsSharpLow, monthsSharpHigh),
      high: Math.max(monthsSharpLow, monthsSharpHigh),
    },
    sharpRates: {
      visitorToLeadPct: cLeadSharp * 100,
      bouncePct: bBounceSharp * 100,
      audienceEfficiencyPct: aMatchSharp * 100,
    },
  };
}

/** When one channel slider moves, rebalance the others to keep sum = 100. */
export function rebalanceChannelPcts(
  prev: Record<ChannelId, number>,
  changedId: ChannelId,
  newPct: number,
): Record<ChannelId, number> {
  const next = { ...prev };
  const v = clamp(Math.round(newPct * 10) / 10, 0, 100);
  next[changedId] = v;
  const others = CHANNEL_DEFS.map((c) => c.id).filter((id) => id !== changedId);
  let remaining = 100 - v;
  if (remaining < 0) remaining = 0;

  const oldSumOthers = others.reduce((s, id) => s + (prev[id] ?? 0), 0);
  if (oldSumOthers <= 0) {
    const even = remaining / others.length;
    others.forEach((id) => {
      next[id] = Math.round(even * 10) / 10;
    });
  } else {
    others.forEach((id) => {
      const share = (prev[id] ?? 0) / oldSumOthers;
      next[id] = Math.round(remaining * share * 10) / 10;
    });
  }

  // Fix drift: adjust last "other" channel
  const total = CHANNEL_DEFS.reduce((s, c) => s + (next[c.id] ?? 0), 0);
  if (Math.abs(total - 100) > 0.01 && others.length > 0) {
    const last = others[others.length - 1];
    const rest = CHANNEL_DEFS.filter((c) => c.id !== last).reduce((s, c) => s + (next[c.id] ?? 0), 0);
    next[last] = Math.round((100 - rest) * 10) / 10;
  }

  return next;
}

export function goalTextFromInputs(inputs: ReverseFunnelInputs, totalLtv: number): string {
  const R = clamp(inputs.revenuePerMonth, 100, 100_000);
  const M = clamp(Math.round(inputs.lifetimeMonths), 1, 60);
  const N = clamp(Math.round(inputs.clientCount), 1, 100);
  const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  return `Land ${N} client${N === 1 ? '' : 's'} at ${usd.format(R)}/month over ${M} months (target ≈ ${usd.format(totalLtv)} LTV).`;
}

export function starterObjectivesFromInputs(inputs: ReverseFunnelInputs): {
  metricName: string;
  baseline: string;
  target: string;
  timeframe: string;
}[] {
  const cLead = pctToDecimal(inputs.visitorToLeadPct);
  const bBounce = pctToDecimal(inputs.bouncePct);
  const aMatch = pctToDecimal(inputs.audienceEfficiencyPct);
  const cLeadSharp = clamp(cLead * 2.0, 0.001, 0.99);
  const bSharp = clamp(bBounce * 0.55, 0, 0.95);
  const aSharp = clamp(aMatch * 1.65, 0.01, 0.99);

  return [
    {
      metricName: 'Visitor → lead conversion',
      baseline: `${inputs.visitorToLeadPct.toFixed(2)}%`,
      target: `${(cLeadSharp * 100).toFixed(2)}%`,
      timeframe: '90 days',
    },
    {
      metricName: 'Bounce rate (top-of-funnel pages)',
      baseline: `${inputs.bouncePct.toFixed(0)}%`,
      target: `${(bSharp * 100).toFixed(0)}%`,
      timeframe: '90 days',
    },
    {
      metricName: 'Audience efficiency (right-fit share)',
      baseline: `${inputs.audienceEfficiencyPct.toFixed(0)}%`,
      target: `${(aSharp * 100).toFixed(0)}%`,
      timeframe: '90 days',
    },
  ];
}

export function buildObjectiveListFromInputs(inputs: ReverseFunnelInputs): Objective[] {
  const ts = Date.now();
  return starterObjectivesFromInputs(inputs).map((o, i) => ({
    id: `obj-${ts}-${i}`,
    ...o,
  }));
}

/** Minimal GOST payload for `createProject(..., initialData)`. */
export function buildInitialGOSTDataFromReverseFunnel(
  inputs: ReverseFunnelInputs,
  result: ReverseFunnelResult,
): GOSTData {
  return {
    executionGoal: { text: goalTextFromInputs(inputs, result.totalLtv) },
    objectives: buildObjectiveListFromInputs(inputs),
    strategies: [],
    tactics: [],
    timeframe: '90-day',
    repository: [],
  };
}
