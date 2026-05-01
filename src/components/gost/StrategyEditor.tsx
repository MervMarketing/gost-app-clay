import { Strategy, Objective } from '@/types/gost';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Info, Target, Circle } from 'lucide-react';
import { AlignmentWarning } from './AlignmentWarning';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StrategyEditorProps {
  strategy: Strategy;
  objectives: Objective[];
  onChange: (id: string, updates: Partial<Strategy>) => void;
  onRemove: (id: string) => void;
  hasIssue: boolean;
  issueMessage?: string;
  canRemove: boolean;
}

export function StrategyEditor({
  strategy,
  objectives,
  onChange,
  onRemove,
  hasIssue,
  issueMessage,
  canRemove
}: StrategyEditorProps) {
  // Use primaryObjectiveId if set, fallback to legacy objectiveId
  const primaryId = strategy.primaryObjectiveId ?? strategy.objectiveId;
  const secondaryIds = strategy.secondaryObjectiveIds ?? [];
  
  // Max 2 secondary objectives for strategies
  const MAX_SECONDARY = 2;
  
  const handlePrimaryChange = (value: string) => {
    const newPrimaryId = value === 'none' ? null : value;
    // Remove from secondary if promoted to primary
    const newSecondaryIds = secondaryIds.filter(id => id !== newPrimaryId);
    onChange(strategy.id, { 
      primaryObjectiveId: newPrimaryId,
      objectiveId: newPrimaryId, // Keep legacy field in sync
      secondaryObjectiveIds: newSecondaryIds
    });
  };
  
  const handleSecondaryToggle = (objectiveId: string) => {
    if (secondaryIds.includes(objectiveId)) {
      // Remove
      onChange(strategy.id, { 
        secondaryObjectiveIds: secondaryIds.filter(id => id !== objectiveId)
      });
    } else if (secondaryIds.length < MAX_SECONDARY) {
      // Add
      onChange(strategy.id, { 
        secondaryObjectiveIds: [...secondaryIds, objectiveId]
      });
    }
  };
  
  const removeSecondary = (objectiveId: string) => {
    onChange(strategy.id, { 
      secondaryObjectiveIds: secondaryIds.filter(id => id !== objectiveId)
    });
  };
  
  // Available objectives for secondary (exclude primary)
  const availableForSecondary = objectives.filter(o => o.id !== primaryId);
  
  return (
    <div className={`group relative p-4 rounded-lg border transition-all duration-200 ${
      hasIssue 
        ? 'border-warning/50 bg-warning-muted' 
        : 'border-border bg-card hover:border-primary/30'
    }`}>
      {hasIssue && (
        <div className="absolute -top-2 -right-2">
          <AlignmentWarning message={issueMessage} />
        </div>
      )}
      
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={strategy.statement}
              onChange={(e) => onChange(strategy.id, { statement: e.target.value })}
              placeholder="Strategy statement (how, not what)"
              className="font-medium"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-muted-foreground hover:text-foreground">
                  <Info className="h-4 w-4" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-sm">
                <p>Strategies are repeatable approaches, not one-off actions.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          {/* Primary Objective (Required) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 shrink-0">
              <Target className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">Primary:</span>
            </div>
            <Select
              value={primaryId || 'none'}
              onValueChange={handlePrimaryChange}
            >
              <SelectTrigger className={cn(
                "h-8 text-sm flex-1",
                !primaryId && "border-warning/50 text-warning"
              )}>
                <SelectValue placeholder="Select primary outcome..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No primary outcome</SelectItem>
                {objectives.map((obj) => (
                  <SelectItem key={obj.id} value={obj.id}>
                    {obj.metricName || 'Unnamed objective'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-muted-foreground hover:text-foreground">
                  <Info className="h-3.5 w-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-sm">
                <p className="font-medium mb-1">Primary Objective (Required)</p>
                <p>The main outcome this strategy exists to drive. Used for alignment checks and prioritization.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          {/* Secondary Objectives (Optional, max 2) */}
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-1.5 shrink-0 pt-1">
              <Circle className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Secondary:</span>
            </div>
            <div className="flex-1 flex flex-wrap items-center gap-1.5">
              {secondaryIds.map(secId => {
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
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ) : null;
              })}
              
              {secondaryIds.length < MAX_SECONDARY && primaryId && availableForSecondary.length > 0 && (
                <Select
                  value=""
                  onValueChange={handleSecondaryToggle}
                >
                  <SelectTrigger className="h-7 text-xs w-auto min-w-[100px] border-dashed">
                    <span className="text-muted-foreground">+ Add secondary</span>
                  </SelectTrigger>
                  <SelectContent>
                    {availableForSecondary
                      .filter(o => !secondaryIds.includes(o.id))
                      .map((obj) => (
                        <SelectItem key={obj.id} value={obj.id} className="text-sm">
                          {obj.metricName || 'Unnamed objective'}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
              
              {secondaryIds.length === 0 && !primaryId && (
                <span className="text-xs text-muted-foreground italic">
                  Set primary first
                </span>
              )}
              
              {secondaryIds.length === 0 && primaryId && availableForSecondary.length === 0 && (
                <span className="text-xs text-muted-foreground italic">
                  No other objectives
                </span>
              )}
              
              {secondaryIds.length >= MAX_SECONDARY && (
                <span className="text-xs text-muted-foreground italic">
                  (max {MAX_SECONDARY})
                </span>
              )}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-muted-foreground hover:text-foreground pt-1">
                  <Info className="h-3.5 w-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-sm">
                <p className="font-medium mb-1">Secondary Objectives (Optional)</p>
                <p>Side effects, not the reason this work exists. Max 2 for strategies. Not used for prioritization.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 shrink-0"
            onClick={() => onRemove(strategy.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
