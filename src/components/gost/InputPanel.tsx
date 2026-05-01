import { useState } from 'react';
import { GOSTData, PyramidLayer, ExecutionGoal, Strategy, PulseFrequency } from '@/types/gost';
import { ClientPriority } from '@/lib/feedbackService';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown, ChevronRight, Lock, Play, CheckCircle2, Clock, Pause, Ban, ListPlus, FileCode } from 'lucide-react';
import { ExecutionGoalEditor } from './ExecutionGoalEditor';
import { ObjectiveEditor } from './ObjectiveEditor';
import { StrategyEditor } from './StrategyEditor';
import { TacticEditor } from './TacticEditor';
import { SortableTacticEditor } from './SortableTacticEditor';
import { StageHelperText } from './StageHelperText';
import { BulkAddItemsDialog } from './BulkAddItemsDialog';
import { BulkAddWithReview } from './BulkAddWithReview';
import { StructuredBulkImport } from './StructuredBulkImport';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface InputPanelProps {
  data: GOSTData;
  activeLayer: PyramidLayer;
  confirmedStages: Set<PyramidLayer>;
  onConfirmStage: (layer: PyramidLayer) => void;
  updateExecutionGoal: (goal: ExecutionGoal) => void;
  updateObjective: (id: string, updates: any) => void;
  addObjective: () => void;
  bulkAddObjectives: (metricNames: string[]) => void;
  removeObjective: (id: string) => void;
  updateStrategy: (id: string, updates: any) => void;
  addStrategy: () => void;
  bulkAddStrategies: (statements: string[]) => void;
  bulkAddStrategiesWithObjectives: (items: { text: string; primaryObjectiveId: string | null }[]) => void;
  structuredBulkImport: (strategies: {
    statement: string;
    primaryObjectiveId: string | null;
    secondaryObjectiveIds: string[];
    tactics: { description: string; primaryObjectiveId: string | null; secondaryObjectiveIds: string[] }[];
  }[]) => { strategiesAdded: number; tacticsAdded: number };
  removeStrategy: (id: string) => void;
  updateTactic: (id: string, updates: any) => void;
  addTactic: (strategyId: string) => void;
  bulkAddTactics: (items: { text: string; primaryObjectiveId: string | null; strategyId?: string }[]) => void;
  removeTactic: (id: string) => void;
  moveTactic: (tacticId: string, newStrategyId: string) => void;
  reorderTactics: (strategyId: string, orderedTacticIds: string[]) => void;
  hasIssue: (type: 'tactic' | 'strategy' | 'objective', id: string) => boolean;
  getIssueMessage: (type: 'tactic' | 'strategy' | 'objective', id: string) => string | undefined;
  isViewOnly?: boolean;
  focusedTacticId?: string | null;
  onClearTacticFocus?: () => void;
  onSwitchToRepository?: (tacticId?: string) => void;
  clientFeedbackMap?: Record<string, { priority: ClientPriority; note?: string }>;
}

const layerTitles: Record<PyramidLayer, { title: string; description: string }> = {
  goal: {
    title: '90-Day Execution Goal',
    description: 'The most important outcome for this planning cycle'
  },
  objectives: {
    title: 'Objectives',
    description: 'Measurable outcomes that indicate progress (3-5 recommended)'
  },
  strategies: {
    title: 'Strategies',
    description: 'Repeatable approaches to achieve objectives (6-8 recommended)'
  },
  tactics: {
    title: 'Tactics',
    description: 'Specific actions grouped by strategy'
  }
};

interface CollapsibleSectionProps {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  hasWarning?: boolean;
  children: React.ReactNode;
  onAdd?: () => void;
  addLabel?: string;
  statusCounts?: { active: number; inProgress: number; completed: number; planned: number };
}

function CollapsibleSection({ 
  title, 
  count, 
  defaultOpen = true, 
  hasWarning = false,
  children, 
  onAdd,
  addLabel = 'Add',
  statusCounts
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "rounded-2xl border border-border/80 shadow-subtle transition-colors",
        hasWarning ? "border-warning/50 bg-warning-muted/30" : "bg-card"
      )}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex w-full items-center justify-between rounded-t-2xl p-4 transition-colors hover:bg-muted/40">
            <div className="flex items-center gap-3">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-display text-sm font-semibold tracking-tight text-foreground">{title}</span>
              {count !== undefined && (
                <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                  {count}
                </span>
              )}
              {hasWarning && (
                <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full">
                  Needs attention
                </span>
              )}
              {statusCounts && (statusCounts.active > 0 || statusCounts.inProgress > 0 || statusCounts.completed > 0) && (
                <div className="flex items-center gap-1.5 text-xs">
                  {statusCounts.active > 0 && (
                    <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400">
                      <Play className="h-3 w-3" /> {statusCounts.active}
                    </span>
                  )}
                  {statusCounts.inProgress > 0 && (
                    <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                      <Pause className="h-3 w-3" /> {statusCounts.inProgress}
                    </span>
                  )}
                  {statusCounts.completed > 0 && (
                    <span className="flex items-center gap-0.5 text-success">
                      <CheckCircle2 className="h-3 w-3" /> {statusCounts.completed}
                    </span>
                  )}
                </div>
              )}
            </div>
            {onAdd && isOpen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd();
                }}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                {addLabel}
              </Button>
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function InputPanel({
  data,
  activeLayer,
  confirmedStages,
  onConfirmStage,
  updateExecutionGoal,
  updateObjective,
  addObjective,
  bulkAddObjectives,
  removeObjective,
  updateStrategy,
  addStrategy,
  bulkAddStrategies,
  bulkAddStrategiesWithObjectives,
  structuredBulkImport,
  removeStrategy,
  updateTactic,
  addTactic,
  bulkAddTactics,
  removeTactic,
  moveTactic,
  reorderTactics,
  hasIssue,
  getIssueMessage,
  isViewOnly = false,
  focusedTacticId,
  onClearTacticFocus,
  onSwitchToRepository,
  clientFeedbackMap
}: InputPanelProps) {
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { title, description } = layerTitles[activeLayer];

  // Check if any objectives have issues
  const objectivesWithIssues = data.objectives.filter(o => hasIssue('objective', o.id));
  
  // Check if any strategies have issues
  const strategiesWithIssues = data.strategies.filter(s => hasIssue('strategy', s.id));

  // Progressive disclosure logic - add null safety
  const isLocked = (layer: PyramidLayer): boolean => {
    if (!confirmedStages) return layer !== 'goal';
    switch (layer) {
      case 'goal': return false;
      case 'objectives': return !confirmedStages.has('goal');
      case 'strategies': return !confirmedStages.has('objectives');
      case 'tactics': return !confirmedStages.has('strategies');
      default: return false;
    }
  };

  const canConfirm = (layer: PyramidLayer): boolean => {
    switch (layer) {
      case 'goal': return !!data.executionGoal.text.trim();
      case 'objectives': return data.objectives.length >= 1 && data.objectives.every(o => o.metricName.trim());
      case 'strategies': return data.strategies.length >= 1 && data.strategies.every(s => 
        s.statement.trim() && (s.primaryObjectiveId ?? s.objectiveId)
      );
      case 'tactics': return data.tactics.every(t => t.strategyId);
      default: return false;
    }
  };

  const locked = isLocked(activeLayer);

  return (
    <div className="animate-fade-in rounded-2xl border border-border/80 bg-card p-6 shadow-subtle">
      <div className="mb-4">
        <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>

      {/* Stage helper text */}
      <div className="mb-4">
        <StageHelperText layer={activeLayer} />
      </div>

      {/* Locked state */}
      {locked && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Confirm the previous stage to unlock {title.toLowerCase()}.
          </p>
        </div>
      )}

      {!locked && activeLayer === 'goal' && (
        <>
          <CollapsibleSection title="Execution Goal" defaultOpen={true}>
            <ExecutionGoalEditor goal={data.executionGoal} onChange={updateExecutionGoal} />
          </CollapsibleSection>
          {confirmedStages && !confirmedStages.has('goal') && (
            <div className="mt-6 rounded-xl border border-border/80 bg-muted/40 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Ready to continue?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {canConfirm('goal') 
                      ? "Your goal is set. Move on to define your objectives." 
                      : "Enter your 90-day goal to proceed."}
                  </p>
                </div>
                <Button 
                  size="lg"
                  disabled={!canConfirm('goal')}
                  onClick={() => onConfirmStage('goal')}
                  className="shrink-0"
                >
                  Continue to Objectives
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {!locked && activeLayer === 'objectives' && (
        <div className="space-y-3">
          {data.objectives.map((objective, index) => (
            <CollapsibleSection
              key={objective.id}
              title={objective.metricName || `Objective ${index + 1}`}
              defaultOpen={index === 0}
              hasWarning={hasIssue('objective', objective.id)}
            >
              <ObjectiveEditor
                objective={objective}
                onChange={updateObjective}
                onRemove={removeObjective}
                hasIssue={hasIssue('objective', objective.id)}
                issueMessage={getIssueMessage('objective', objective.id)}
                canRemove={data.objectives.length > 1}
              />
            </CollapsibleSection>
          ))}
          {data.objectives.length < 5 && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={addObjective}>
                <Plus className="h-4 w-4 mr-2" />
                Add Objective
              </Button>
              <BulkAddItemsDialog
                itemType="objective"
                currentCount={data.objectives.length}
                maxItems={5}
                onAdd={(items) => {
                  bulkAddObjectives(items);
                  toast.success(`Added ${items.length} objectives`);
                }}
                trigger={
                  <Button variant="outline" size="icon" title="Add multiple objectives">
                    <ListPlus className="h-4 w-4" />
                  </Button>
                }
              />
            </div>
          )}
          {data.objectives.length >= 5 && (
            <p className="text-xs text-muted-foreground text-center">
              Maximum 5 objectives (focus is power)
            </p>
          )}
          {confirmedStages && !confirmedStages.has('objectives') && (
            <div className="mt-4 rounded-xl border border-border/80 bg-muted/40 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Ready to continue?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {canConfirm('objectives') 
                      ? "Your objectives are set. Move on to define your strategies." 
                      : "Add at least one objective with a metric name to proceed."}
                  </p>
                </div>
                <Button 
                  size="lg"
                  disabled={!canConfirm('objectives')}
                  onClick={() => onConfirmStage('objectives')}
                  className="shrink-0"
                >
                  Continue to Strategies
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {!locked && activeLayer === 'strategies' && (
        <div className="space-y-3">
          {data.strategies.map((strategy, index) => {
            const linkedObjective = data.objectives.find(o => o.id === strategy.objectiveId);
            const tacticsCount = data.tactics.filter(t => t.strategyId === strategy.id).length;
            
            return (
              <CollapsibleSection
                key={strategy.id}
                title={strategy.statement || `Strategy ${index + 1}`}
                count={tacticsCount}
                defaultOpen={index === 0}
                hasWarning={hasIssue('strategy', strategy.id)}
              >
                <StrategyEditor
                  strategy={strategy}
                  objectives={data.objectives}
                  onChange={updateStrategy}
                  onRemove={removeStrategy}
                  hasIssue={hasIssue('strategy', strategy.id)}
                  issueMessage={getIssueMessage('strategy', strategy.id)}
                  canRemove={data.strategies.length > 1}
                />
              </CollapsibleSection>
            );
          })}
          {data.strategies.length < 10 && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={addStrategy}>
                <Plus className="h-4 w-4 mr-2" />
                Add Strategy
              </Button>
              <BulkAddWithReview
                itemType="strategy"
                objectives={data.objectives}
                currentCount={data.strategies.length}
                maxItems={10}
                onAdd={(items) => {
                  bulkAddStrategiesWithObjectives(items);
                  toast.success(`Added ${items.length} strategies`);
                }}
                trigger={
                  <Button variant="outline" size="icon" title="Add multiple strategies with objective assignment">
                    <ListPlus className="h-4 w-4" />
                  </Button>
                }
              />
              <StructuredBulkImport
                objectives={data.objectives}
                onImport={(strategies) => {
                  const result = structuredBulkImport(strategies);
                  toast.success(`Added ${result.strategiesAdded} strategies with ${result.tacticsAdded} tactics`);
                }}
                trigger={
                  <Button variant="outline" size="icon" title="Import strategies + tactics from outline">
                    <FileCode className="h-4 w-4" />
                  </Button>
                }
              />
            </div>
          )}
          {data.strategies.length >= 10 && (
            <p className="text-xs text-muted-foreground text-center">
              Maximum 10 strategies (avoid dilution)
            </p>
          )}
          {confirmedStages && !confirmedStages.has('strategies') && (
            <div className="mt-4 rounded-xl border border-border/80 bg-muted/40 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Ready to continue?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {canConfirm('strategies') 
                      ? "Your strategies are set. Move on to define your tactics." 
                      : "Each strategy needs a statement and a primary objective."}
                  </p>
                </div>
                <Button 
                  size="lg"
                  disabled={!canConfirm('strategies')}
                  onClick={() => onConfirmStage('strategies')}
                  className="shrink-0"
                >
                  Continue to Tactics
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {!locked && activeLayer === 'tactics' && (
        <div className="space-y-3">
          {/* Bulk add tactics across strategies */}
          <div className="flex justify-end">
            <BulkAddWithReview
              itemType="tactic"
              objectives={data.objectives}
              strategies={data.strategies}
              currentCount={data.tactics.length}
              onAdd={(items) => {
                bulkAddTactics(items);
                toast.success(`Added ${items.length} tactics`);
              }}
              trigger={
                <Button variant="outline" size="sm" className="gap-2">
                  <ListPlus className="h-4 w-4" />
                  Bulk Add Tactics
                </Button>
              }
            />
          </div>
          
          {data.strategies.map((strategy, index) => {
            const strategyTactics = data.tactics.filter(t => t.strategyId === strategy.id);
            // Separate by status
            const visibleTactics = strategyTactics.filter(t => t.status !== 'cut');
            const cutTactics = strategyTactics.filter(t => t.status === 'cut');
            
            const statusCounts = {
              active: strategyTactics.filter(t => t.status === 'active').length,
              inProgress: strategyTactics.filter(t => t.status === 'in_progress').length,
              completed: strategyTactics.filter(t => t.status === 'completed').length,
              planned: strategyTactics.filter(t => t.status === 'planned').length
            };
            
            const hasTacticIssues = strategyTactics.some(t => hasIssue('tactic', t.id));
            
            return (
              <CollapsibleSection
                key={strategy.id}
                title={strategy.statement || `Strategy ${index + 1}`}
                count={visibleTactics.length}
                defaultOpen={index === 0}
                hasWarning={hasTacticIssues}
                onAdd={() => addTactic(strategy.id)}
                addLabel="Add Tactic"
                statusCounts={statusCounts}
              >
                {strategyTactics.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 px-3 bg-muted rounded-lg">
                    No tactics yet. Add tactics to execute this strategy.
                  </p>
                ) : (
                  <>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event: DragEndEvent) => {
                        const { active, over } = event;
                        if (over && active.id !== over.id) {
                          const oldIndex = visibleTactics.findIndex(t => t.id === active.id);
                          const newIndex = visibleTactics.findIndex(t => t.id === over.id);
                          const reorderedIds = arrayMove(
                            visibleTactics.map(t => t.id),
                            oldIndex,
                            newIndex
                          );
                          reorderTactics(strategy.id, reorderedIds);
                        }
                      }}
                    >
                      <SortableContext
                        items={visibleTactics.map(t => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {visibleTactics.map((tactic) => (
                            <SortableTacticEditor
                              key={tactic.id}
                              tactic={tactic}
                              strategies={data.strategies}
                              objectives={data.objectives}
                              goal={data.executionGoal.text}
                              onChange={updateTactic}
                              onRemove={removeTactic}
                              onMove={moveTactic}
                              hasIssue={hasIssue('tactic', tactic.id)}
                              issueMessage={getIssueMessage('tactic', tactic.id)}
                              pulseFrequency={data.pulseFrequency ?? 'standard'}
                              isFocused={focusedTacticId === tactic.id}
                              onClearFocus={onClearTacticFocus}
                              onSwitchToRepository={onSwitchToRepository}
                              clientFeedback={clientFeedbackMap?.[tactic.id]}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                    {/* Show cut tactics collapsed */}
                    {cutTactics.length > 0 && (
                      <Collapsible>
                        <CollapsibleTrigger className="w-full flex items-center gap-2 text-xs text-muted-foreground py-2 hover:text-foreground transition-colors">
                          <ChevronRight className="w-3 h-3" />
                          <Ban className="w-3 h-3" />
                          {cutTactics.length} cut tactic{cutTactics.length > 1 ? 's' : ''}
                          <span className="text-muted-foreground/60 italic ml-1">— Cutting is progress.</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 mt-2">
                          {cutTactics.map((tactic) => (
                            <TacticEditor
                              key={tactic.id}
                              tactic={tactic}
                              strategies={data.strategies}
                              objectives={data.objectives}
                              goal={data.executionGoal.text}
                              onChange={updateTactic}
                              onRemove={removeTactic}
                              onMove={moveTactic}
                              hasIssue={hasIssue('tactic', tactic.id)}
                              issueMessage={getIssueMessage('tactic', tactic.id)}
                              pulseFrequency={data.pulseFrequency ?? 'standard'}
                              isFocused={focusedTacticId === tactic.id}
                              onClearFocus={onClearTacticFocus}
                              onSwitchToRepository={onSwitchToRepository}
                              clientFeedback={clientFeedbackMap?.[tactic.id]}
                            />
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </>
                )}
              </CollapsibleSection>
            );
          })}
        </div>
      )}
    </div>
  );
}
