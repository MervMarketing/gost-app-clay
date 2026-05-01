import { useMemo, useState } from 'react';
import { RepositoryItem, Objective, PulseFrequency, TacticStatus } from '@/types/gost';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { 
  derivePriorityBucket, 
  getEffectiveExecutionWindow,
  PRIORITY_BUCKET_CONFIG,
  PriorityBucket 
} from '@/lib/priorityBuckets';
import { RotIndicator } from './RotIndicator';
import { deriveRotLevel, getLatestPulseCheck, getCurrentProgress, isActiveTactic } from '@/lib/pulseCheck';
import { formatDistanceToNow } from 'date-fns';
import { 
  Target, 
  DollarSign, 
  ChevronRight,
  Zap,
  Clock,
  Pencil,
  PlayCircle
} from 'lucide-react';

interface TacticCardProps {
  item: RepositoryItem;
  objectives: Objective[];
  activeObjectiveIds: Set<string>;
  pulseFrequency: PulseFrequency;
  isSelected: boolean;
  isFocused?: boolean;
  onToggleSelection: (id: string) => void;
  onUpdate: (id: string, updates: Partial<RepositoryItem>) => void;
  onOpenDetail: (item: RepositoryItem) => void;
  onQuickProgressUpdate?: (id: string) => void;
  onSwitchToActivePlan?: (tacticDescription: string) => void;
}

// Simplified status for display
const TACTIC_STATUS_CONFIG: Record<TacticStatus, { label: string; color: string; shortLabel: string }> = {
  planned: { label: 'Planned', shortLabel: 'Plan', color: 'bg-secondary text-secondary-foreground' },
  active: { label: 'Active', shortLabel: 'Act', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
  in_progress: { label: 'In Progress', shortLabel: 'WIP', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
  completed: { label: 'Done', shortLabel: 'Done', color: 'bg-success-muted text-success' },
  cut: { label: 'Cut', shortLabel: 'Cut', color: 'bg-muted text-muted-foreground' }
};

const EXECUTION_WINDOW_SHORT: Record<string, string> = {
  '30-day': '30d',
  '60-day': '60d',
  '90-day': '90d'
};

const ABILITY_CONFIG: Record<string, { label: string; color: string }> = {
  high: { label: 'H', color: 'bg-success-muted text-success' },
  medium: { label: 'M', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
  low: { label: 'L', color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' }
};

export function TacticCard({
  item,
  objectives,
  activeObjectiveIds,
  pulseFrequency,
  isSelected,
  isFocused,
  onToggleSelection,
  onUpdate,
  onOpenDetail,
  onQuickProgressUpdate,
  onSwitchToActivePlan
}: TacticCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Compute derived values
  const executionWindow = getEffectiveExecutionWindow(item);
  const tacticStatus = item.tacticStatus || 'planned';
  const priorityBucket = derivePriorityBucket(item, activeObjectiveIds);
  const bucketConfig = PRIORITY_BUCKET_CONFIG[priorityBucket];
  const statusConfig = TACTIC_STATUS_CONFIG[tacticStatus];
  const abilityConfig = ABILITY_CONFIG[item.abilityToExecute];

  // Create a mock tactic object for pulse check logic
  const mockTactic = useMemo(() => ({
    id: item.id,
    description: item.description,
    status: tacticStatus,
    strategyId: '',
    executionWindow,
    pulseChecks: [], // Would need to store on RepositoryItem too
    startedAt: item.promotedAt
  }), [item, tacticStatus, executionWindow]);

  const rotLevel = deriveRotLevel(mockTactic, pulseFrequency);
  const latestPulse = getLatestPulseCheck(mockTactic);
  const currentProgress = getCurrentProgress(mockTactic);
  const isActive = tacticStatus === 'active' || tacticStatus === 'in_progress';
  
  // Get linked objective name
  const linkedObjective = objectives.find(o => o.id === item.outcomeSupported);
  const objectiveLabel = linkedObjective?.metricName || 'No objective';

  // Format last update time
  const lastUpdateText = useMemo(() => {
    if (latestPulse) {
      return `Pulse ${formatDistanceToNow(new Date(latestPulse.recordedAt), { addSuffix: false })} ago`;
    }
    if (item.promotedAt) {
      return `Started ${formatDistanceToNow(new Date(item.promotedAt), { addSuffix: false })} ago`;
    }
    return `Added ${formatDistanceToNow(new Date(item.createdAt), { addSuffix: false })} ago`;
  }, [latestPulse, item.promotedAt, item.createdAt]);

  const handleStatusChange = (newStatus: TacticStatus) => {
    onUpdate(item.id, { tacticStatus: newStatus });
  };

  const isTerminalState = tacticStatus === 'completed' || tacticStatus === 'cut';

  return (
    <div 
      className={cn(
        "group relative p-3 sm:p-3 rounded-lg border bg-card transition-all cursor-pointer",
        "hover:border-primary/30 hover:shadow-sm active:scale-[0.99]",
        isSelected && "border-primary ring-1 ring-primary/20",
        isFocused && "ring-2 ring-primary border-primary bg-primary/5 shadow-lg shadow-primary/20",
        isTerminalState && "opacity-60"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onOpenDetail(item)}
    >
      {/* Row 1: Edit button + Selection + Title + Expand Arrow */}
      <div className="flex items-start gap-2">
        {/* Edit pencil icon - top left */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-5 sm:w-5 shrink-0 text-muted-foreground hover:text-foreground touch-manipulation"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail(item);
              }}
            >
              <Pencil className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit tactic</TooltipContent>
        </Tooltip>
        <div onClick={(e) => e.stopPropagation()} className="flex items-center pt-1 sm:pt-0.5">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelection(item.id)}
            className="h-5 w-5 sm:h-4 sm:w-4"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground line-clamp-2 pr-6">
            {item.description}
          </p>
        </div>
        <ChevronRight className={cn(
          "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
          isHovered && "translate-x-0.5"
        )} />
      </div>

      {/* Row 2: Status + Window + Objective + Ability */}
      <div className="flex items-center gap-1 sm:gap-1.5 mt-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
        {/* Status dropdown */}
        <Select value={tacticStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className={cn(
            "h-7 sm:h-6 w-auto min-w-[65px] sm:min-w-[60px] px-2 text-[11px] sm:text-[10px] font-medium border-0 touch-manipulation",
            statusConfig.color
          )}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TACTIC_STATUS_CONFIG).map(([value, config]) => (
              <SelectItem key={value} value={value} className="text-xs">
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Execution Window pill */}
        <Badge variant="outline" className="h-7 sm:h-6 px-1.5 text-[11px] sm:text-[10px] gap-0.5">
          <Clock className="h-2.5 w-2.5" />
          {EXECUTION_WINDOW_SHORT[executionWindow]}
        </Badge>

        {/* Objective (truncated) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="h-7 sm:h-6 px-1.5 text-[11px] sm:text-[10px] gap-0.5 max-w-[80px] sm:max-w-[100px]">
              <Target className="h-2.5 w-2.5 text-primary shrink-0" />
              <span className="truncate">{objectiveLabel}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>{objectiveLabel}</TooltipContent>
        </Tooltip>

        {/* Ability chip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn("h-7 sm:h-6 px-1.5 text-[11px] sm:text-[10px] gap-0.5", abilityConfig.color)}>
              <Zap className="h-2.5 w-2.5" />
              {abilityConfig.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Ability to Execute: {item.abilityToExecute}</TooltipContent>
        </Tooltip>
      </div>

      {/* Row 3: Rot + Last Update + Progress + Priority + Budget */}
      <div className="flex items-center gap-2 mt-2 text-[11px] sm:text-[10px] text-muted-foreground">
        {/* Rot indicator - only for active tactics */}
        {isActive && (
          <div className="flex items-center gap-1">
            <RotIndicator rotLevel={rotLevel} />
            <span className="hidden sm:inline">{lastUpdateText}</span>
          </div>
        )}

        {/* Progress - only for active tactics */}
        {isActive ? (
          <div className="flex items-center gap-1">
            <span className="font-medium text-foreground">{currentProgress}%</span>
            {onQuickProgressUpdate && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] sm:text-[10px] touch-manipulation"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickProgressUpdate(item.id);
                }}
              >
                Update
              </Button>
            )}
          </div>
        ) : (
          <span>—</span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Priority bucket */}
        {!isTerminalState && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px]", bucketConfig.color)}>
                {bucketConfig.emoji} {bucketConfig.label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="text-xs">{bucketConfig.shortDescription}</TooltipContent>
          </Tooltip>
        )}

        {/* Budget indicator */}
        {item.hasBudget && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="h-5 px-1 text-[10px] gap-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="h-2.5 w-2.5" />
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Has external budget</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* View in Active Plan link - only for promoted tactics */}
      {item.status === 'promoted' && onSwitchToActivePlan && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSwitchToActivePlan(item.description);
            }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <PlayCircle className="h-3 w-3" />
            <span>View in Active Plan</span>
          </button>
        </div>
      )}
    </div>
  );
}
