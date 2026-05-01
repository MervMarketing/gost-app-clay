import { useMemo, useState } from 'react';
import { GOSTData, Tactic, PulseFrequency, PULSE_FREQUENCY_LABELS, RepositoryItem } from '@/types/gost';
import { 
  PlayCircle, 
  Activity,
  Settings2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  getPulseChecksNeededCount, 
  isActiveTactic,
  deriveRotLevel
} from '@/lib/pulseCheck';
import { getEffectiveExecutionWindow } from '@/lib/priorityBuckets';
import { RotIndicator } from './RotIndicator';
import { PulseCheckDialog } from './PulseCheckDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ExecutionDashboardProps {
  data: GOSTData;
  onUpdateTactic?: (id: string, updates: Partial<Tactic>) => void;
  onUpdateRepositoryItem?: (id: string, updates: Partial<RepositoryItem>) => void;
  onUpdatePulseFrequency?: (frequency: PulseFrequency) => void;
  isViewOnly?: boolean;
}

// Helper to check if a repository item is active (promoted + active status + 30-day window)
function isActiveRepositoryItem(item: RepositoryItem): boolean {
  if (item.type !== 'tactic') return false;
  if (item.status !== 'promoted') return false;
  const tacticStatus = item.tacticStatus ?? 'planned';
  if (tacticStatus !== 'active' && tacticStatus !== 'in_progress') return false;
  const window = getEffectiveExecutionWindow(item);
  return window === '30-day';
}

// Convert repository item to tactic-like object for pulse check logic
function shortRecordId(id: string): string {
  if (id.length <= 14) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function repoItemToTactic(item: RepositoryItem): Tactic & { isRepoItem: boolean } {
  return {
    id: item.id,
    description: item.description,
    strategyId: '', // Not relevant for pulse checks
    status: item.tacticStatus ?? 'planned',
    executionWindow: getEffectiveExecutionWindow(item),
    pulseChecks: item.pulseChecks ?? [],
    startedAt: item.promotedAt,
    hasBudget: item.hasBudget,
    isRepoItem: true // Flag to identify repository items
  };
}

export function ExecutionDashboard({ 
  data, 
  onUpdateTactic, 
  onUpdateRepositoryItem,
  onUpdatePulseFrequency,
  isViewOnly = false 
}: ExecutionDashboardProps) {
  const [pulseDialogTactic, setPulseDialogTactic] = useState<(Tactic & { isRepoItem?: boolean }) | null>(null);
  
  const pulseFrequency = data.pulseFrequency ?? 'standard';
  
  // Combine tactics from active plan AND promoted repository items
  const allActiveTactics = useMemo(() => {
    // Active plan tactics
    const planTactics = data.tactics.filter(t => isActiveTactic(t));
    
    // Repository items that are promoted + active + 30-day
    const repoTactics = (data.repository ?? [])
      .filter(isActiveRepositoryItem)
      .map(repoItemToTactic);
    
    return [...planTactics, ...repoTactics];
  }, [data.tactics, data.repository]);

  // Active plan stats - simplified
  const stats = useMemo(() => {
    const activeTactics = allActiveTactics;
    const pulseChecksNeeded = getPulseChecksNeededCount(allActiveTactics, pulseFrequency);

    return {
      activeTactics: activeTactics.length,
      pulseChecksNeeded
    };
  }, [allActiveTactics, pulseFrequency]);

  // Get tactics needing pulse checks for the list
  const tacticsNeedingPulse = useMemo(() => {
    return allActiveTactics.filter(t => {
      const rotLevel = deriveRotLevel(t, pulseFrequency);
      return rotLevel === 'slowing' || rotLevel === 'stalled';
    });
  }, [allActiveTactics, pulseFrequency]);

  const handlePulseSubmit = (tacticId: string, progress: 0 | 25 | 50 | 75 | 100, note?: string) => {
    const newPulseCheck = {
      id: `pulse-${Date.now()}`,
      progress,
      note,
      recordedAt: new Date().toISOString()
    };

    console.log('[PulseCheck] Submitting pulse for tactic:', tacticId, 'progress:', progress);

    // Check if this is a repository item
    const repoItem = (data.repository ?? []).find(r => r.id === tacticId);
    if (repoItem && onUpdateRepositoryItem) {
      console.log('[PulseCheck] Found in repository, updating repository item');
      const updates: Partial<RepositoryItem> = {
        pulseChecks: [...(repoItem.pulseChecks ?? []), newPulseCheck]
      };
      
      // If marked as 100%, also update tactic status to completed
      if (progress === 100) {
        updates.tacticStatus = 'completed';
        updates.completedAt = new Date().toISOString();
      }
      
      onUpdateRepositoryItem(tacticId, updates);
      return;
    }

    // Otherwise, it's a plan tactic
    if (!onUpdateTactic) {
      console.warn('[PulseCheck] No onUpdateTactic callback provided!');
      return;
    }
    
    const tactic = data.tactics.find(t => t.id === tacticId);
    if (!tactic) {
      console.warn('[PulseCheck] Tactic not found in plan:', tacticId);
      return;
    }

    console.log('[PulseCheck] Found in Active Plan, existing pulseChecks:', tactic.pulseChecks);
    
    const updates: Partial<Tactic> = {
      pulseChecks: [...(tactic.pulseChecks ?? []), newPulseCheck]
    };

    // If marked as 100%, also update status to completed
    if (progress === 100) {
      updates.status = 'completed';
      updates.completedAt = new Date().toISOString();
    }

    console.log('[PulseCheck] Calling onUpdateTactic with updates:', updates);
    onUpdateTactic(tacticId, updates);
  };

  // Empty state
  const hasActiveTactics = stats.activeTactics > 0;
  
  if (!hasActiveTactics && !isViewOnly) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/80 bg-muted/40 shadow-subtle">
          <PlayCircle className="h-8 w-8 text-foreground/70" />
        </div>
        <h3 className="mb-2 font-display text-xl font-semibold tracking-tight text-foreground">No active tactics</h3>
        <p className="mb-6 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
          Move tactics to the 30-day window and set them to Active to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Tactics Count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-card shadow-subtle">
            <PlayCircle className="h-5 w-5 text-foreground/80" />
          </div>
          <div>
            <div className="font-display text-2xl font-semibold tracking-tight text-foreground">{stats.activeTactics}</div>
            <div className="text-xs text-muted-foreground">Active tactic{stats.activeTactics === 1 ? '' : 's'}</div>
          </div>
        </div>
        
        {/* Frequency setting */}
        {!isViewOnly && onUpdatePulseFrequency && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 rounded-2xl border-border/80 shadow-elevated">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Pulse Check Frequency
                </label>
                <Select
                  value={pulseFrequency}
                  onValueChange={(v) => onUpdatePulseFrequency(v as PulseFrequency)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PULSE_FREQUENCY_LABELS).map(([value, { label, description }]) => (
                      <SelectItem key={value} value={value} className="text-sm">
                        <div className="flex flex-col">
                          <span>{label}</span>
                          <span className="text-xs text-muted-foreground">{description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground pt-1">
                  How often tactics need a progress update.
                </p>
              </div>
            </PopoverContent>
          </Popover>
        )}

      </div>

      {/* Pulse reminder — points to table below */}
      {tacticsNeedingPulse.length > 0 && (
        <div className="flex flex-col gap-1 rounded-xl border border-warning/25 bg-warning-muted/35 px-3 py-2.5 shadow-subtle sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 shrink-0 text-warning" />
            <p className="text-sm text-foreground">
              <span className="font-medium">{tacticsNeedingPulse.length}</span> tactic
              {tacticsNeedingPulse.length === 1 ? '' : 's'} need{tacticsNeedingPulse.length === 1 ? 's' : ''} a pulse check.
            </p>
          </div>
          {!isViewOnly && (
            <p className="text-xs text-muted-foreground sm:text-right">Use the Pulse column or click a highlighted row.</p>
          )}
        </div>
      )}

      {/* All active tactics — single dense table */}
      {stats.activeTactics > 0 && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-display text-sm font-semibold tracking-tight text-foreground">Active tactics</h3>
            {stats.pulseChecksNeeded > 0 && (
              <span className="text-xs tabular-nums text-muted-foreground">{stats.pulseChecksNeeded} due</span>
            )}
          </div>
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-subtle">
            <Table>
              <TableHeader>
                <TableRow className="border-border/70 hover:bg-transparent">
                  <TableHead className="w-[52px]">Health</TableHead>
                  <TableHead>Tactic</TableHead>
                  <TableHead className="hidden w-[80px] sm:table-cell">Window</TableHead>
                  <TableHead className="hidden w-[96px] md:table-cell">Status</TableHead>
                  <TableHead className="hidden w-[72px] lg:table-cell">Source</TableHead>
                  <TableHead className="min-w-[5.5rem]">ID</TableHead>
                  {!isViewOnly && <TableHead className="w-[88px] text-right">Pulse</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {allActiveTactics.map((tactic) => {
                  const rotLevel = deriveRotLevel(tactic, pulseFrequency);
                  const needsPulse = rotLevel === 'slowing' || rotLevel === 'stalled';
                  const extended = tactic as Tactic & { isRepoItem?: boolean };
                  const source = extended.isRepoItem ? 'Parking' : 'Plan';
                  const windowLabel =
                    tactic.executionWindow === '30-day'
                      ? '30d'
                      : tactic.executionWindow === '60-day'
                        ? '60d'
                        : '90d';

                  return (
                    <TableRow
                      key={tactic.id}
                      className={cn(
                        needsPulse && 'bg-warning-muted/25 hover:bg-warning-muted/35',
                        !isViewOnly && needsPulse && 'cursor-pointer',
                      )}
                      onClick={() => {
                        if (!isViewOnly && needsPulse) setPulseDialogTactic(tactic);
                      }}
                    >
                      <TableCell>
                        <RotIndicator rotLevel={rotLevel} />
                      </TableCell>
                      <TableCell className="max-w-[min(48vw,24rem)] font-medium text-foreground">
                        <span className="line-clamp-2" title={tactic.description}>
                          {tactic.description || 'Unnamed tactic'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">{windowLabel}</TableCell>
                      <TableCell className="hidden capitalize text-muted-foreground md:table-cell">
                        {(tactic.status || '—').replace('_', ' ')}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">{source}</TableCell>
                      <TableCell>
                        <code
                          className="font-mono text-[0.7rem] text-muted-foreground"
                          title={tactic.id}
                        >
                          {shortRecordId(tactic.id)}
                        </code>
                      </TableCell>
                      {!isViewOnly && (
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          {needsPulse ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-lg text-xs"
                              onClick={() => setPulseDialogTactic(tactic)}
                            >
                              Log
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* All good state */}
      {tacticsNeedingPulse.length === 0 && stats.activeTactics > 0 && (
        <div className="rounded-xl border border-border/80 bg-muted/30 px-4 py-3 text-center shadow-subtle">
          <Activity className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">All tactics are up to date on pulse checks.</p>
        </div>
      )}

      {/* Pulse Check Dialog */}
      {pulseDialogTactic && (
        <PulseCheckDialog
          tactic={pulseDialogTactic}
          open={!!pulseDialogTactic}
          onOpenChange={(open) => !open && setPulseDialogTactic(null)}
          onSubmit={handlePulseSubmit}
        />
      )}
    </div>
  );
}
