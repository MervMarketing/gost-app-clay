import type { GOSTData } from '@/types/gost';

export type PlanTimeframe = GOSTData['timeframe'];

/** Default copy for new objectives' `timeframe` field (human-readable). */
export function planTimeframeToObjectiveString(tf: PlanTimeframe): string {
  switch (tf) {
    case '1-week':
      return '1 week';
    case '2-week':
      return '2 weeks';
    case '90-day':
      return '90 days';
    case '6-month':
      return '6 months';
    case '12-month':
      return '12 months';
    default:
      return '90 days';
  }
}

/** Short title fragment, e.g. "1-Week Plan". */
export function planTimeframeToPlanTitleShort(tf: PlanTimeframe): string {
  switch (tf) {
    case '1-week':
      return '1-Week';
    case '2-week':
      return '2-Week';
    case '90-day':
      return '90-Day';
    case '6-month':
      return '6-Month';
    case '12-month':
      return '12-Month';
    default:
      return '90-Day';
  }
}

/** Labels for the plan-level timeframe control (shortest → longest). */
export const PLAN_TIMEFRAME_OPTIONS: { value: PlanTimeframe; label: string }[] = [
  { value: '1-week', label: '1 Week (sprint)' },
  { value: '2-week', label: '2 Weeks (sprint)' },
  { value: '90-day', label: '90 Days' },
  { value: '6-month', label: '6 Months' },
  { value: '12-month', label: '12 Months' },
];

export function planTimeframeSelectLabel(tf: PlanTimeframe): string {
  return PLAN_TIMEFRAME_OPTIONS.find((o) => o.value === tf)?.label ?? '90 Days';
}

export function normalizePlanTimeframe(raw: unknown): PlanTimeframe {
  if (raw === '1-week' || raw === '2-week' || raw === '90-day' || raw === '6-month' || raw === '12-month') {
    return raw;
  }
  return '90-day';
}
