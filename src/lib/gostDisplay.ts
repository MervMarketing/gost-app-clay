import type { Objective, Strategy, Tactic } from '@/types/gost';

/**
 * Backward-compatible display helpers.
 * Some older imported/legacy data may have `title` instead of the current
 * Objective.metricName / Strategy.statement / Tactic.description fields.
 */

export function getObjectiveDisplayName(obj: Objective): string {
  const legacyTitle = (obj as unknown as { title?: string }).title;
  return obj.metricName || legacyTitle || '';
}

export function getStrategyDisplayName(str: Strategy): string {
  const legacyTitle = (str as unknown as { title?: string }).title;
  return str.statement || legacyTitle || '';
}

export function getTacticDisplayName(tac: Tactic): string {
  const legacyTitle = (tac as unknown as { title?: string }).title;
  return tac.description || legacyTitle || '';
}
