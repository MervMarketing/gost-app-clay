import { useEffect, useRef, useState } from 'react';
import { Tactic, TacticStatus, Strategy, Objective, ExecutionWindow, PulseFrequency } from '@/types/gost';
import { ClientPriority } from '@/lib/feedbackService';
import { ClientFeedbackBadge } from './ClientFeedbackBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, GripVertical, ArrowRight, Clock, Play, CheckCircle2, Pause, Ban, Target, Circle, Info, DollarSign, Calendar, Pencil, Activity, Archive, ChevronDown, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlignmentWarning } from './AlignmentWarning';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { RotIndicator } from './RotIndicator';
import { PulseCheckDialog } from './PulseCheckDialog';
import { deriveRotLevel, isActiveTactic, getCurrentProgress } from '@/lib/pulseCheck';
import { ProgressTimeline } from './ProgressTimeline';

// Execution window labels
const executionWindowLabels: Record<ExecutionWindow, string> = {
  '30-day': 'Now (30d)',
  '60-day': 'Next (60d)',
  '90-day': 'Later (90d)'
};

const executionWindowColors: Record<ExecutionWindow, string> = {
  '30-day': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  '60-day': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  '90-day': 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
};

interface TacticEditorProps {
  tactic: Tactic;
  strategies: Strategy[];
  objectives: Objective[];
  goal: string;
  onChange: (id: string, updates: Partial<Tactic>) => void;
  onRemove: (id: string) => void;
  onMove: (tacticId: string, newStrategyId: string) => void;
  hasIssue: boolean;
  issueMessage?: string;
  pulseFrequency?: PulseFrequency;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isFocused?: boolean;
  onClearFocus?: () => void;
  onSwitchToRepository?: (tacticId?: string) => void;
  clientFeedback?: { priority: ClientPriority; note?: string } | null;
}

const statusConfig: Record<TacticStatus, { 
  color: string; 
  label: string; 
  icon: typeof Play;
  bgColor: string;
}> = {
  planned: { 
    color: 'text-secondary-foreground', 
    label: 'Planned', 
    icon: Clock,
    bgColor: 'bg-secondary'
  },
  active: { 
    color: 'text-blue-600 dark:text-blue-400', 
    label: 'Active', 
    icon: Play,
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  in_progress: { 
    color: 'text-amber-600 dark:text-amber-400', 
    label: 'In Progress', 
    icon: Pause,
    bgColor: 'bg-amber-100 dark:bg-amber-900/30'
  },
  completed: { 
    color: 'text-success', 
    label: 'Completed', 
    icon: CheckCircle2,
    bgColor: 'bg-success-muted'
  },
  cut: { 
    color: 'text-muted-foreground', 
    label: 'Cut', 
    icon: Ban,
    bgColor: 'bg-muted'
  }
};

export function TacticEditor({
  tactic,
  strategies,
  objectives,
  goal,
  onChange,
  onRemove,
  onMove,
  hasIssue,
  issueMessage,
  pulseFrequency = 'standard',
  dragHandleProps,
  isFocused,
  onClearFocus,
  onSwitchToRepository,
  clientFeedback
}: TacticEditorProps) {
  const [showObjectives, setShowObjectives] = useState(false);
  const [showPulseDialog, setShowPulseDialog] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Handle focus - scroll into view and clear after animation
  useEffect(() => {
    if (isFocused && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const timer = setTimeout(() => {
        onClearFocus?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isFocused, onClearFocus]);
  
  // Derived values
  const executionWindow = tactic.executionWindow ?? '90-day';
  const isActive = isActiveTactic(tactic);
  const rotLevel = isActive ? deriveRotLevel(tactic, pulseFrequency) : null;
  const currentProgress = getCurrentProgress(tactic);
  
  const linkedStrategy = strategies.find(s => s.id === tactic.strategyId);
  
  // Inherit primary from strategy if tactic doesn't have its own
  const strategyPrimaryId = linkedStrategy?.primaryObjectiveId ?? linkedStrategy?.objectiveId;
  const tacticPrimaryId = tactic.primaryObjectiveId ?? strategyPrimaryId;
  const tacticSecondaryIds = tactic.secondaryObjectiveIds ?? [];
  
  const primaryObjective = tacticPrimaryId 
    ? objectives.find(o => o.id === tacticPrimaryId)
    : null;

  const config = statusConfig[tactic.status];
  const StatusIcon = config.icon;

  // Max 1 secondary objective for tactics
  const MAX_SECONDARY = 1;
  
  const handlePrimaryChange = (value: string) => {
    const newPrimaryId = value === 'inherit' ? null : value;
    // Remove from secondary if promoted to primary
    const newSecondaryIds = tacticSecondaryIds.filter(id => id !== newPrimaryId);
    onChange(tactic.id, { 
      primaryObjectiveId: newPrimaryId,
      secondaryObjectiveIds: newSecondaryIds
    });
  };
  
  const handleSecondaryToggle = (objectiveId: string) => {
    if (tacticSecondaryIds.includes(objectiveId)) {
      onChange(tactic.id, { 
        secondaryObjectiveIds: tacticSecondaryIds.filter(id => id !== objectiveId)
      });
    } else if (tacticSecondaryIds.length < MAX_SECONDARY) {
      onChange(tactic.id, { 
        secondaryObjectiveIds: [...tacticSecondaryIds, objectiveId]
      });
    }
  };
  
  const removeSecondary = (objectiveId: string) => {
    onChange(tactic.id, { 
      secondaryObjectiveIds: tacticSecondaryIds.filter(id => id !== objectiveId)
    });
  };
  
  // Available objectives for secondary (exclude the effective primary)
  const effectivePrimaryId = tactic.primaryObjectiveId ?? strategyPrimaryId;
  const availableForSecondary = objectives.filter(o => o.id !== effectivePrimaryId);

  return (
    <div 
      ref={cardRef}
      className={cn(
        "group relative p-3 rounded-lg border transition-all duration-200",
        hasIssue 
          ? 'border-warning/50 bg-warning-muted' 
          : 'border-border bg-card hover:border-primary/30',
        isFocused && 'ring-2 ring-primary border-primary bg-primary/5 shadow-lg shadow-primary/20',
        tactic.status === 'cut' && 'opacity-60'
      )}>
      {hasIssue && (
        <div className="absolute -top-2 -right-2">
          <AlignmentWarning message={issueMessage} />
        </div>
      )}
      
      {/* Row 1: Drag handle + Tactic title */}
      <div className="flex items-center gap-2 mb-2">
        <div 
          {...dragHandleProps}
          className="touch-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0 hover:text-foreground transition-colors" />
        </div>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Input
              value={tactic.description}
              onChange={(e) => onChange(tactic.id, { description: e.target.value })}
              placeholder="Tactic description"
              className={cn(
                "flex-1 text-sm font-semibold border-0 bg-transparent px-1 h-7 focus-visible:bg-muted/50 focus-visible:ring-1",
                tactic.status === 'cut' && 'line-through text-muted-foreground',
                tactic.status === 'completed' && 'text-success'
              )}
            />
          </TooltipTrigger>
          {tactic.description && (
            <TooltipContent side="top" className="max-w-sm">
              <p className="text-sm">{tactic.description}</p>
            </TooltipContent>
          )}
        </Tooltip>
        
        {/* Client feedback badge */}
        {clientFeedback && (
          <ClientFeedbackBadge priority={clientFeedback.priority} note={clientFeedback.note} />
        )}
        
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 shrink-0"
          onClick={() => onRemove(tactic.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Row 2: Controls */}
      <div className="flex flex-wrap items-center gap-2 ml-6">
        <Select
          value={tactic.status}
          onValueChange={(value: TacticStatus) => onChange(tactic.id, { status: value })}
        >
          <SelectTrigger className={cn("w-24 sm:w-28 h-8 text-xs gap-1", config.bgColor, config.color)}>
            <StatusIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">{config.label}</span>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(statusConfig).map(([value, cfg]) => {
              const Icon = cfg.icon;
              return (
                <SelectItem key={value} value={value} className="text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-3 w-3", cfg.color)} />
                    {cfg.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        
        <Select
          value={tactic.strategyId}
          onValueChange={(value) => onMove(tactic.id, value)}
        >
          <SelectTrigger className="w-28 sm:w-36 h-8 text-xs">
            <SelectValue placeholder="Link strategy..." />
          </SelectTrigger>
          <SelectContent>
            {strategies.map((str) => (
              <SelectItem key={str.id} value={str.id} className="text-sm">
                {str.statement || 'Unnamed strategy'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Execution Window selector */}
        <Select
          value={executionWindow}
          onValueChange={(value: ExecutionWindow) => {
            const updates: Partial<Tactic> = { executionWindow: value };
            // If moving to 30-day and status is planned, auto-set to active
            if (value === '30-day' && tactic.status === 'planned') {
              updates.status = 'active';
              updates.startedAt = new Date().toISOString();
            }
            onChange(tactic.id, updates);
          }}
        >
          <SelectTrigger className={cn("w-20 sm:w-24 h-8 text-xs", executionWindowColors[executionWindow])}>
            <Calendar className="h-3 w-3 shrink-0 mr-1" />
            <span className="truncate">{executionWindowLabels[executionWindow]}</span>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(executionWindowLabels).map(([value, label]) => (
              <SelectItem key={value} value={value} className="text-sm">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Rot indicator - only for active 30-day tactics */}
        {rotLevel && (
          <RotIndicator rotLevel={rotLevel} />
        )}
        
        {/* Budget toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 shrink-0 transition-colors",
                tactic.hasBudget 
                  ? "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50" 
                  : "text-muted-foreground/50 hover:text-muted-foreground"
              )}
              onClick={() => onChange(tactic.id, { hasBudget: !tactic.hasBudget })}
            >
              <DollarSign className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">
              {tactic.hasBudget ? 'Has external budget (click to remove)' : 'Mark as having external budget'}
            </p>
          </TooltipContent>
        </Tooltip>
        
        {/* Pulse check button - only for active 30-day tactics */}
        {isActive && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-primary hover:bg-primary/10"
                onClick={() => setShowPulseDialog(true)}
              >
                <Activity className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Update progress ({currentProgress}%)</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      
      {/* Progress Timeline for active/completed tactics with pulse checks */}
      {isActive && tactic.startedAt && (tactic.pulseChecks?.length ?? 0) > 0 && (
        <div className="mt-2 ml-6">
          <ProgressTimeline
            startDate={tactic.startedAt}
            pulseChecks={tactic.pulseChecks ?? []}
            completedAt={tactic.status === 'completed' ? tactic.completedAt : null}
            onClickTimeline={() => setShowPulseDialog(true)}
          />
        </div>
      )}
      
      {/* Simple progress bar (fallback when no pulse checks yet) */}
      {isActive && currentProgress > 0 && (tactic.pulseChecks?.length ?? 0) === 0 && (
        <div className="mt-2 ml-6">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${currentProgress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{currentProgress}%</span>
          </div>
        </div>
      )}
      
      {/* Time tracking info - editable */}
      {(tactic.status === 'active' || tactic.status === 'in_progress' || tactic.status === 'completed' || tactic.startedAt) && (
        <div className="mt-2 ml-6 flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group/time">
                <Clock className="h-3 w-3" />
                {tactic.startedAt ? (
                  <span>Started {format(new Date(tactic.startedAt), 'MMM d, yyyy')}</span>
                ) : (
                  <span className="italic">Set start date</span>
                )}
                <Pencil className="h-2.5 w-2.5 opacity-0 group-hover/time:opacity-100 transition-opacity" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                <Input
                  type="datetime-local"
                  value={tactic.startedAt ? format(new Date(tactic.startedAt), "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    onChange(tactic.id, { 
                      startedAt: value ? new Date(value).toISOString() : undefined 
                    });
                  }}
                  className="h-8 text-sm"
                />
                {tactic.startedAt && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground"
                    onClick={() => onChange(tactic.id, { startedAt: undefined })}
                  >
                    Clear date
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
          
          {tactic.completedAt && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group/time">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Completed {format(new Date(tactic.completedAt), 'MMM d, yyyy')}</span>
                  <Pencil className="h-2.5 w-2.5 opacity-0 group-hover/time:opacity-100 transition-opacity" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Completion Date</label>
                  <Input
                    type="datetime-local"
                    value={tactic.completedAt ? format(new Date(tactic.completedAt), "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      onChange(tactic.id, { 
                        completedAt: value ? new Date(value).toISOString() : undefined 
                      });
                    }}
                    className="h-8 text-sm"
                  />
                  {tactic.completedAt && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground"
                      onClick={() => onChange(tactic.id, { completedAt: undefined })}
                    >
                      Clear date
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}
      
      {/* Objectives Section (Collapsible) */}
      <Collapsible open={showObjectives} onOpenChange={setShowObjectives}>
        <CollapsibleTrigger className="mt-2 ml-6 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {showObjectives ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <Target className="h-3 w-3" />
          <span>Objectives</span>
          {primaryObjective && (
            <span className="text-primary font-medium ml-1">
              {primaryObjective.metricName}
            </span>
          )}
          {!tactic.primaryObjectiveId && strategyPrimaryId && (
            <span className="italic text-muted-foreground ml-1">(inherited)</span>
          )}
          {tacticSecondaryIds.length > 0 && (
            <span className="text-muted-foreground ml-1">+{tacticSecondaryIds.length}</span>
          )}
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-2 ml-6 space-y-2">
          {/* Primary Objective */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 shrink-0">
              <Target className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium">Primary:</span>
            </div>
            <Select
              value={tactic.primaryObjectiveId ?? 'inherit'}
              onValueChange={handlePrimaryChange}
            >
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue placeholder="Inherit from strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inherit" className="text-sm">
                  <span className="flex items-center gap-2">
                    <span>Inherit from strategy</span>
                    {strategyPrimaryId && (
                      <span className="text-muted-foreground">
                        ({objectives.find(o => o.id === strategyPrimaryId)?.metricName || 'Unnamed'})
                      </span>
                    )}
                  </span>
                </SelectItem>
                {objectives.map((obj) => (
                  <SelectItem key={obj.id} value={obj.id} className="text-sm">
                    {obj.metricName || 'Unnamed objective'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-muted-foreground hover:text-foreground">
                  <Info className="h-3 w-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-sm">
                <p>Choose the main outcome this tactic drives. By default, inherits from the linked strategy.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          {/* Secondary Objective */}
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
              <Circle className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Secondary:</span>
            </div>
            <div className="flex-1 flex flex-wrap items-center gap-1.5">
              {tacticSecondaryIds.map(secId => {
                const obj = objectives.find(o => o.id === secId);
                return obj ? (
                  <Badge 
                    key={secId} 
                    variant="secondary" 
                    className="text-xs gap-1 pr-1"
                  >
                    {obj.metricName || 'Unnamed'}
                    <button 
                      onClick={() => removeSecondary(secId)}
                      className="ml-0.5 hover:bg-secondary-foreground/20 rounded p-0.5"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ) : null;
              })}
              
              {tacticSecondaryIds.length < MAX_SECONDARY && availableForSecondary.length > 0 && (
                <Select
                  value=""
                  onValueChange={handleSecondaryToggle}
                >
                  <SelectTrigger className="h-6 text-xs w-auto min-w-[90px] border-dashed">
                    <span className="text-muted-foreground">+ Add</span>
                  </SelectTrigger>
                  <SelectContent>
                    {availableForSecondary
                      .filter(o => !tacticSecondaryIds.includes(o.id))
                      .map((obj) => (
                        <SelectItem key={obj.id} value={obj.id} className="text-sm">
                          {obj.metricName || 'Unnamed objective'}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
              
              {tacticSecondaryIds.length >= MAX_SECONDARY && (
                <span className="text-xs text-muted-foreground italic">(max {MAX_SECONDARY})</span>
              )}
              
              {tacticSecondaryIds.length === 0 && availableForSecondary.length === 0 && (
                <span className="text-xs text-muted-foreground italic">No other objectives</span>
              )}
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground italic ml-4">
            Secondary objectives are side effects, not the reason this work exists.
          </p>
        </CollapsibleContent>
      </Collapsible>
      
      {/* Dependency path - only show when objectives section is closed and no time tracking */}
      {linkedStrategy && !hasIssue && !tactic.startedAt && !showObjectives && (
        <div className="mt-2 ml-6 flex items-center gap-1 text-xs text-muted-foreground overflow-hidden">
          <span className="truncate max-w-[100px]">{tactic.description || 'Tactic'}</span>
          <ArrowRight className="h-3 w-3 shrink-0" />
          <span className="truncate max-w-[100px]">{linkedStrategy.statement || 'Strategy'}</span>
          {primaryObjective && (
            <>
              <ArrowRight className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[100px]">{primaryObjective.metricName || 'Objective'}</span>
            </>
          )}
          <ArrowRight className="h-3 w-3 shrink-0" />
          <span className="truncate max-w-[80px]">Goal</span>
          
          {/* View in All Tactics link */}
          {onSwitchToRepository && (
            <>
              <span className="mx-1">•</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSwitchToRepository();
                }}
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <Archive className="h-3 w-3" />
                <span>All Tactics</span>
              </button>
            </>
          )}
        </div>
      )}
      
      {/* View in All Tactics link - always visible */}
      {onSwitchToRepository && (
        <div className="mt-2 ml-6">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSwitchToRepository(tactic.id);
            }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Archive className="h-3 w-3" />
            <span>View in All Tactics</span>
          </button>
        </div>
      )}
      
      {/* Pulse Check Dialog */}
      <PulseCheckDialog
        tactic={tactic}
        open={showPulseDialog}
        onOpenChange={setShowPulseDialog}
        onSubmit={(tacticId, progress, note) => {
          const newPulseCheck = {
            id: `pulse-${Date.now()}`,
            progress,
            note,
            recordedAt: new Date().toISOString()
          };
          
          const updates: Partial<Tactic> = {
            pulseChecks: [...(tactic.pulseChecks ?? []), newPulseCheck]
          };
          
          // If marked as 100%, also update status to completed
          if (progress === 100) {
            updates.status = 'completed';
            updates.completedAt = new Date().toISOString();
          }
          
          onChange(tacticId, updates);
        }}
      />
    </div>
  );
}
