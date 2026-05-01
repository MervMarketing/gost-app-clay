import { X, Target, TrendingUp, Lightbulb, CheckSquare, Play, CheckCircle2, Clock, Ban, Pause } from 'lucide-react';
import { GOSTData, TacticStatus } from '@/types/gost';
import { cn } from '@/lib/utils';
import { getObjectiveDisplayName, getStrategyDisplayName, getTacticDisplayName } from '@/lib/gostDisplay';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FullScreenOverviewProps {
  data: GOSTData;
  onClose: () => void;
}

// Generate a consistent color for each objective
const objectiveColors = [
  { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-600 dark:text-blue-400', accent: 'bg-blue-500' },
  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-400', accent: 'bg-emerald-500' },
  { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-600 dark:text-amber-400', accent: 'bg-amber-500' },
  { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-600 dark:text-purple-400', accent: 'bg-purple-500' },
  { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-600 dark:text-rose-400', accent: 'bg-rose-500' },
];

const statusIcons: Record<TacticStatus, typeof Play> = {
  planned: Clock,
  active: Play,
  in_progress: Pause,
  completed: CheckCircle2,
  cut: Ban
};

export function FullScreenOverview({ data, onClose }: FullScreenOverviewProps) {
  // Build relationship map: objective -> strategies -> tactics
  const objectiveMap = data.objectives.map((objective, index) => {
    const color = objectiveColors[index % objectiveColors.length];
    // Use primaryObjectiveId (preferred) or fall back to deprecated objectiveId
    const strategies = data.strategies.filter(s => (s.primaryObjectiveId ?? s.objectiveId) === objective.id);
    const strategyIds = strategies.map(s => s.id);
    const tactics = data.tactics.filter(t => strategyIds.includes(t.strategyId));
    
    return {
      objective,
      strategies,
      tactics,
      color,
    };
  });

  // Find unlinked strategies and tactics
  const linkedStrategyIds = data.strategies.filter(s => s.primaryObjectiveId ?? s.objectiveId).map(s => s.id);
  const unlinkedStrategies = data.strategies.filter(s => !(s.primaryObjectiveId ?? s.objectiveId));
  const unlinkedTactics = data.tactics.filter(t => !linkedStrategyIds.includes(t.strategyId));

  // Execution stats
  const activeTactics = data.tactics.filter(t => t.status === 'active' || t.status === 'in_progress').length;
  const completedTactics = data.tactics.filter(t => t.status === 'completed').length;
  const totalTactics = data.tactics.filter(t => t.status !== 'cut').length;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">GOST Overview</h1>
          <span className="text-sm text-muted-foreground">
            {data.timeframe === '90-day' ? '90-Day' : data.timeframe === '6-month' ? '6-Month' : '12-Month'} Plan
          </span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
            {activeTactics} active · {completedTactics} completed · {totalTactics} total
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-65px)]">
        <div className="p-8 max-w-7xl mx-auto">
          {/* Execution Goal Section */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-pyramid-goal text-primary-foreground">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">90-Day Execution Goal</span>
                <h2 className="text-lg font-semibold text-foreground">What Must Be True</h2>
              </div>
            </div>
            <div className="bg-pyramid-goal/10 border border-pyramid-goal/20 rounded-xl p-6">
              <p className="text-lg font-medium text-foreground">
                {data.executionGoal.text || 'No execution goal defined'}
              </p>
            </div>
          </div>

          {/* Objectives with their Strategies and Tactics */}
          <div className="space-y-8">
            {objectiveMap.map(({ objective, strategies, tactics, color }, objIndex) => (
              <div key={objective.id} className="relative">
                {/* Objective Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className={cn("flex items-center justify-center w-10 h-10 rounded-full shrink-0", color.accent, "text-white")}>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <span className={cn("text-xs font-medium uppercase tracking-wide", color.text)}>
                      Objective {objIndex + 1}
                    </span>
                    <h3 className="text-base font-semibold text-foreground">
                      {getObjectiveDisplayName(objective) || 'Unnamed objective'}
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>Baseline: {objective.baseline || '—'}</span>
                      <span>→</span>
                      <span className="font-medium text-foreground">Target: {objective.target || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Strategies and Tactics Grid */}
                <div className={cn("ml-14 rounded-xl border p-4", color.bg, color.border)}>
                  {strategies.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No strategies linked to this objective</p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {strategies.map((strategy) => {
                        const strategyTactics = data.tactics.filter(t => t.strategyId === strategy.id);
                        return (
                          <div key={strategy.id} className="bg-card rounded-lg border border-border shadow-subtle p-4">
                            {/* Strategy */}
                            <div className="flex items-start gap-2 mb-3">
                              <Lightbulb className={cn("w-4 h-4 mt-0.5 shrink-0", color.text)} />
                              <p className="text-sm font-medium text-foreground leading-snug">
                                {getStrategyDisplayName(strategy) || 'Unnamed strategy'}
                              </p>
                            </div>
                            
                            {/* Tactics */}
                            {strategyTactics.length > 0 && (
                              <div className="space-y-1.5 ml-6">
                                {strategyTactics.map((tactic) => {
                                  const StatusIcon = statusIcons[tactic.status];
                                  return (
                                    <div 
                                      key={tactic.id} 
                                      className={cn(
                                        "flex items-start gap-2 text-xs",
                                        tactic.status === 'cut' && "opacity-40 line-through"
                                      )}
                                    >
                                      <StatusIcon className={cn(
                                        "w-3 h-3 mt-0.5 shrink-0",
                                        tactic.status === 'active' || tactic.status === 'in_progress' ? 'text-blue-500' : 
                                        tactic.status === 'completed' ? 'text-success' : 
                                        'text-muted-foreground/50'
                                      )} />
                                      <span className="text-muted-foreground">
                                        {getTacticDisplayName(tactic) || 'Unnamed tactic'}
                                      </span>
                                      {(tactic.status === 'active' || tactic.status === 'in_progress') && (
                                        <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full ml-auto shrink-0">
                                          {tactic.status === 'in_progress' ? 'In Progress' : 'Active'}
                                        </span>
                                      )}
                                      {tactic.status === 'completed' && (
                                        <span className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded-full ml-auto shrink-0">
                                          Done
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            
                            {strategyTactics.length === 0 && (
                              <p className="text-xs text-muted-foreground italic ml-6">No tactics</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Unlinked Items */}
            {(unlinkedStrategies.length > 0 || unlinkedTactics.length > 0) && (
              <div className="mt-12 pt-8 border-t border-border">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-medium text-warning uppercase tracking-wide">
                    ⚠ Unlinked Items
                  </span>
                </div>
                
                <div className="bg-warning-muted border border-warning/20 rounded-xl p-4">
                  {unlinkedStrategies.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-foreground mb-2">Strategies without objectives:</p>
                      <div className="space-y-2">
                        {unlinkedStrategies.map(s => (
                          <div key={s.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Lightbulb className="w-4 h-4 text-warning" />
                            {getStrategyDisplayName(s) || 'Unnamed strategy'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {unlinkedTactics.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">Tactics without valid strategies:</p>
                      <div className="space-y-2">
                        {unlinkedTactics.map(t => (
                          <div key={t.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckSquare className="w-4 h-4 text-warning" />
                            {getTacticDisplayName(t) || 'Unnamed tactic'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="mt-12 pt-8 border-t border-border">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-card border border-border">
                <div className="text-2xl font-bold text-foreground">1</div>
                <div className="text-xs text-muted-foreground">Execution Goal</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-card border border-border">
                <div className="text-2xl font-bold text-foreground">{data.objectives.length}</div>
                <div className="text-xs text-muted-foreground">Objectives</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-card border border-border">
                <div className="text-2xl font-bold text-foreground">{data.strategies.length}</div>
                <div className="text-xs text-muted-foreground">Strategies</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-2xl font-bold text-foreground">{activeTactics}</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-lg text-muted-foreground">{totalTactics}</span>
                </div>
                <div className="text-xs text-muted-foreground">Active Tactics</div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
