// Tactic execution lifecycle
export type TacticStatus = 'planned' | 'active' | 'in_progress' | 'completed' | 'cut';

// Execution Window - which 30-day window this tactic belongs to
export type ExecutionWindow = '30-day' | '60-day' | '90-day';

// Pulse Check - lightweight progress declaration
export interface PulseCheck {
  id: string;
  progress: 0 | 25 | 50 | 75 | 100;
  note?: string;
  recordedAt: string; // ISO timestamp
}

// Pulse Check frequency - plan-level setting
export type PulseFrequency = 'relaxed' | 'standard' | 'tight';

// Days between pulse checks for each frequency
export const PULSE_FREQUENCY_DAYS: Record<PulseFrequency, number> = {
  relaxed: 21,
  standard: 7,
  tight: 4
};

// Pulse frequency labels for UI
export const PULSE_FREQUENCY_LABELS: Record<PulseFrequency, { label: string; description: string }> = {
  relaxed: { label: 'Relaxed', description: 'Every ~21 days' },
  standard: { label: 'Standard', description: 'Every ~7 days' },
  tight: { label: 'Tight (Sprint Mode)', description: 'Every ~3-4 days' }
};

// Rot Level - derived visual indicator
export type RotLevel = 'fresh' | 'slowing' | 'stalled';

export interface Tactic {
  id: string;
  description: string;
  notes?: string; // Optional context/details about what this tactic means
  status: TacticStatus;
  strategyId: string;
  // Primary + Secondary objective support
  primaryObjectiveId?: string | null; // Required for alignment (inherits from strategy if not set)
  secondaryObjectiveIds?: string[]; // Optional, max 1
  // Budget flag - indicates external cost/outsourcing
  hasBudget?: boolean;
  // Execution timestamps
  startedAt?: string; // ISO timestamp when moved to active/in_progress
  completedAt?: string; // ISO timestamp when completed
  // Execution Window - which phase this tactic belongs to
  executionWindow?: ExecutionWindow; // Default: '90-day'
  // Pulse Checks - progress declarations
  pulseChecks?: PulseCheck[];
}

export interface Strategy {
  id: string;
  statement: string;
  objectiveId: string | null; // Deprecated - use primaryObjectiveId
  primaryObjectiveId: string | null; // Required for alignment
  secondaryObjectiveIds: string[]; // Optional, max 2
}

// Objective Update - timestamped note for context retention
export interface ObjectiveUpdate {
  id: string;
  value: string;        // e.g. "Orders/day ≈ 23"
  note?: string;        // optional context
  recordedAt: string;   // auto timestamp (ISO)
}

export interface Objective {
  id: string;
  metricName: string;
  baseline: string;
  target: string;
  timeframe: string;
  updates?: ObjectiveUpdate[];
}

// Execution Goal - the 90-day north star
export interface ExecutionGoal {
  text: string;
}

// Repository item types
export type RepositoryItemType = 'objective' | 'strategy' | 'tactic';
export type RepositoryStatus = 'backlog' | 'queued' | 'promoted' | 'completed' | 'cut';
export type GrowthStage = 'early' | 'scaling' | 'optimization';
export type CompanyContext = 'solo' | 'small_team' | 'team';
export type AbilityToExecute = 'low' | 'medium' | 'high';
export type TimeHorizon = 'short' | 'medium' | 'long';

export interface RepositoryItem {
  id: string;
  type: RepositoryItemType;
  description: string;
  notes?: string; // Optional context/details about what this item means
  outcomeSupported: string | null; // Links to an objective ID
  growthStage: GrowthStage;
  companyContext: CompanyContext;
  abilityToExecute: AbilityToExecute;
  timeHorizon: TimeHorizon;
  status: RepositoryStatus;
  createdAt: string;
  promotedAt?: string;
  hasBudget?: boolean; // Budget flag - indicates external cost/outsourcing (for tactics)
  // Execution fields (for tactics only)
  executionWindow?: ExecutionWindow; // Default: '90-day'
  tacticStatus?: TacticStatus; // Default: 'planned'
  completedAt?: string; // ISO timestamp when completed (for tactics only)
  // Pulse Checks - progress declarations (for tactics only)
  pulseChecks?: PulseCheck[];
}

export interface GOSTData {
  executionGoal: ExecutionGoal;
  objectives: Objective[];
  strategies: Strategy[];
  tactics: Tactic[];
  timeframe: '90-day' | '6-month' | '12-month';
  repository: RepositoryItem[];
  // Plan-level settings
  pulseFrequency?: PulseFrequency; // Default: 'standard'
  [key: string]: unknown; // Allow JSON serialization
}

export type PyramidLayer = 'goal' | 'objectives' | 'strategies' | 'tactics';
