import { GOSTData, Tactic, PulseFrequency, RepositoryItem } from '@/types/gost';
import { Sparkles } from 'lucide-react';
import { ExecutionDashboard } from './ExecutionDashboard';

interface RepositoryDashboardProps {
  data: GOSTData;
  isViewOnly?: boolean;
  onUpdateTactic?: (id: string, updates: Partial<Tactic>) => void;
  onUpdateRepositoryItem?: (id: string, updates: Partial<RepositoryItem>) => void;
  onUpdatePulseFrequency?: (frequency: PulseFrequency) => void;
}

export function RepositoryDashboard({ 
  data, 
  isViewOnly = false,
  onUpdateTactic,
  onUpdateRepositoryItem,
  onUpdatePulseFrequency
}: RepositoryDashboardProps) {
  // Check if plan is empty
  const hasActivePlan = data.executionGoal.text || data.objectives.length > 0 || data.strategies.length > 0 || data.tactics.length > 0;

  // Empty state - only show if plan is empty
  if (!hasActivePlan) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/80 bg-muted/40 shadow-subtle">
          <Sparkles className="h-8 w-8 text-foreground/70" />
        </div>
        <h3 className="mb-2 font-display text-xl font-semibold tracking-tight text-foreground">No plan yet</h3>
        <p className="mb-6 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
          Import a plan or start building from scratch. Your objectives, strategies, and tactics will appear here.
        </p>
      </div>
    );
  }

  return (
    <ExecutionDashboard 
      data={data}
      onUpdateTactic={onUpdateTactic}
      onUpdateRepositoryItem={onUpdateRepositoryItem}
      onUpdatePulseFrequency={onUpdatePulseFrequency}
      isViewOnly={isViewOnly}
    />
  );
}
