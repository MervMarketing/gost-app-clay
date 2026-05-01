import { Tactic, PulseCheck, RotLevel, PulseFrequency, PULSE_FREQUENCY_DAYS } from '@/types/gost';

/**
 * Get the latest pulse check for a tactic
 */
export function getLatestPulseCheck(tactic: Tactic): PulseCheck | null {
  if (!tactic.pulseChecks || tactic.pulseChecks.length === 0) {
    return null;
  }
  
  return tactic.pulseChecks.reduce((latest, current) => {
    return new Date(current.recordedAt) > new Date(latest.recordedAt) ? current : latest;
  }, tactic.pulseChecks[0]);
}

/**
 * Get the current progress of a tactic (from latest pulse check)
 */
export function getCurrentProgress(tactic: Tactic): number {
  // If completed, return 100
  if (tactic.status === 'completed') return 100;
  
  const latest = getLatestPulseCheck(tactic);
  return latest?.progress ?? 0;
}

/**
 * Check if a tactic is active (Active status)
 * For plan tactics: any active/in_progress tactic counts
 * The 30-day window filter is informational, not restrictive for plan tactics
 * (Plan tactics don't always have executionWindow set)
 */
export function isActiveTactic(tactic: Tactic): boolean {
  const isActive = tactic.status === 'active' || tactic.status === 'in_progress';
  return isActive;
}

/**
 * Get the number of days since the last pulse check or start date
 */
export function getDaysSinceLastActivity(tactic: Tactic): number {
  const latest = getLatestPulseCheck(tactic);
  const referenceDate = latest?.recordedAt ?? tactic.startedAt;
  
  if (!referenceDate) {
    return Infinity; // Never had a pulse check and no start date
  }
  
  const now = new Date();
  const lastActivity = new Date(referenceDate);
  const diffMs = now.getTime() - lastActivity.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if a tactic needs a pulse check based on frequency
 */
export function needsPulseCheck(tactic: Tactic, frequency: PulseFrequency): boolean {
  // Only active tactics in 30-day window need pulse checks
  if (!isActiveTactic(tactic)) return false;
  
  // If completed via pulse check (100%), no more needed
  const latestProgress = getCurrentProgress(tactic);
  if (latestProgress === 100) return false;
  
  const daysSinceLast = getDaysSinceLastActivity(tactic);
  const frequencyDays = PULSE_FREQUENCY_DAYS[frequency];
  
  return daysSinceLast >= frequencyDays;
}

/**
 * Derive the rot level for a tactic based on progress changes
 * 
 * Fresh: Progress updated recently OR progress increased since last check
 * Slowing: No progress change across one pulse check cycle
 * Stalled: No progress change across two pulse check cycles
 */
export function deriveRotLevel(tactic: Tactic, frequency: PulseFrequency): RotLevel {
  // Only active tactics have rot levels
  if (!isActiveTactic(tactic)) return 'fresh';
  
  // If completed, always fresh
  if (tactic.status === 'completed') return 'fresh';
  
  const pulseChecks = tactic.pulseChecks ?? [];
  const frequencyDays = PULSE_FREQUENCY_DAYS[frequency];
  const daysSinceLast = getDaysSinceLastActivity(tactic);
  
  // If updated recently (within frequency window), it's fresh
  if (daysSinceLast < frequencyDays) {
    return 'fresh';
  }
  
  // Check if progress has been increasing
  if (pulseChecks.length >= 2) {
    // Sort by date descending
    const sorted = [...pulseChecks].sort((a, b) => 
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
    
    const latest = sorted[0];
    const previous = sorted[1];
    
    // If latest is higher than previous, still fresh (momentum)
    if (latest.progress > previous.progress) {
      return 'fresh';
    }
    
    // If two cycles have passed with no progress change, stalled
    if (daysSinceLast >= frequencyDays * 2) {
      return 'stalled';
    }
  }
  
  // One cycle with no progress = slowing
  if (daysSinceLast >= frequencyDays) {
    return 'slowing';
  }
  
  return 'fresh';
}

/**
 * Get rot level tooltip text
 */
export function getRotTooltip(rotLevel: RotLevel): string {
  switch (rotLevel) {
    case 'fresh':
      return 'Updated recently';
    case 'slowing':
      return 'No recent movement';
    case 'stalled':
      return 'No movement for a while';
  }
}

/**
 * Get the count of tactics needing pulse checks
 */
export function getPulseChecksNeededCount(tactics: Tactic[], frequency: PulseFrequency): number {
  return tactics.filter(t => needsPulseCheck(t, frequency)).length;
}

/**
 * Create a new pulse check record
 */
export function createPulseCheck(progress: 0 | 25 | 50 | 75 | 100, note?: string): PulseCheck {
  return {
    id: `pulse-${Date.now()}`,
    progress,
    note: note?.trim() || undefined,
    recordedAt: new Date().toISOString()
  };
}
