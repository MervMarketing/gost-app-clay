import { Target, TrendingUp, Lightbulb, CheckSquare, Play, CheckCircle2, Clock, Ban, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GOSTData, PyramidLayer, TacticStatus, Objective, Strategy, Tactic } from '@/types/gost';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getObjectiveDisplayName, getStrategyDisplayName, getTacticDisplayName } from '@/lib/gostDisplay';

interface PyramidVisualizationProps {
  data: GOSTData;
  alignmentIssues: { type: string; id: string }[];
  activeLayer: PyramidLayer | null;
  onLayerClick: (layer: PyramidLayer) => void;
  onItemClick?: (type: 'objective' | 'strategy' | 'tactic', item: Objective | Strategy | Tactic) => void;
}

// Color palette for objectives and their linked items
const objectiveColors = [
  { bg: 'bg-blue-500', light: 'bg-blue-400/80' },
  { bg: 'bg-emerald-500', light: 'bg-emerald-400/80' },
  { bg: 'bg-amber-500', light: 'bg-amber-400/80' },
  { bg: 'bg-purple-500', light: 'bg-purple-400/80' },
  { bg: 'bg-rose-500', light: 'bg-rose-400/80' },
];

const statusIcons: Record<TacticStatus, typeof Play> = {
  planned: Clock,
  active: Play,
  in_progress: Pause,
  completed: CheckCircle2,
  cut: Ban
};

interface ItemBadgeProps {
  label: string;
  tooltip: string;
  colorClass: string;
  hasIssue?: boolean;
  isActive?: boolean;
  status?: TacticStatus;
  onClick?: () => void;
}

function ItemBadge({ label, tooltip, colorClass, hasIssue, isActive, status, onClick }: ItemBadgeProps) {
  const StatusIcon = status ? statusIcons[status] : null;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          className={cn(
            "flex items-center justify-center min-w-7 h-7 px-2 rounded-md text-xs font-medium text-white transition-all gap-1",
            colorClass,
            hasIssue && "ring-2 ring-warning ring-offset-1 ring-offset-transparent",
            isActive === false && "opacity-50",
            onClick && "cursor-pointer hover:scale-110 hover:shadow-md active:scale-95"
          )}
        >
          {StatusIcon && <StatusIcon className="w-3 h-3" />}
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-sm">{tooltip}</p>
        {status && <p className="text-xs text-muted-foreground capitalize mt-1">Status: {status.replace('_', ' ')}</p>}
        {onClick && <p className="text-xs text-primary mt-1">Click to edit</p>}
      </TooltipContent>
    </Tooltip>
  );
}

export function PyramidVisualization({ data, alignmentIssues, activeLayer, onLayerClick, onItemClick }: PyramidVisualizationProps) {
  const hasIssue = (type: string, id: string) => {
    return alignmentIssues.some(issue => issue.type === type && issue.id === id);
  };

  // Build color map for objectives
  const objectiveColorMap = new Map<string, typeof objectiveColors[0]>();
  data.objectives.forEach((obj, i) => {
    objectiveColorMap.set(obj.id, objectiveColors[i % objectiveColors.length]);
  });

  // Get color for strategy based on its objective
  const getStrategyColor = (strategyId: string) => {
    const strategy = data.strategies.find(s => s.id === strategyId);
    if (strategy?.objectiveId) {
      return objectiveColorMap.get(strategy.objectiveId)?.light || 'bg-muted-foreground/60';
    }
    return 'bg-muted-foreground/60';
  };

  // Get color for tactic based on its strategy's objective
  const getTacticColor = (tacticId: string) => {
    const tactic = data.tactics.find(t => t.id === tacticId);
    if (tactic) {
      const strategy = data.strategies.find(s => s.id === tactic.strategyId);
      if (strategy?.objectiveId) {
        return objectiveColorMap.get(strategy.objectiveId)?.light || 'bg-muted-foreground/40';
      }
    }
    return 'bg-muted-foreground/40';
  };

  // Execution stats for quick view
  const activeTactics = data.tactics.filter(t => t.status === 'active' || t.status === 'in_progress').length;
  const completedTactics = data.tactics.filter(t => t.status === 'completed').length;

  return (
    <div className="flex flex-col items-center gap-3 py-6">
      {/* Execution Goal Layer */}
      <button
        onClick={() => onLayerClick('goal')}
        className={cn(
          "relative flex flex-col items-center gap-2 px-8 py-4 rounded-xl transition-all duration-300",
          "w-[45%] bg-pyramid-goal text-primary-foreground",
          activeLayer === 'goal' && "ring-[3px] ring-primary ring-offset-4 ring-offset-background scale-[1.02] shadow-lg shadow-primary/20",
          activeLayer !== 'goal' && "hover:scale-[1.01] hover:brightness-105"
        )}
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4" />
          <span className="text-sm font-semibold uppercase tracking-wide">90-Day Goal</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="text-xs text-center opacity-90 line-clamp-2 cursor-default">
              {data.executionGoal.text || 'Define your execution goal...'}
            </p>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-sm">
            <p>{data.executionGoal.text || 'No execution goal defined'}</p>
          </TooltipContent>
        </Tooltip>
      </button>

      {/* Objectives Layer */}
      <button
        onClick={() => onLayerClick('objectives')}
        className={cn(
          "relative flex flex-col items-center gap-3 px-6 py-4 rounded-xl transition-all duration-300",
          "w-[60%] bg-pyramid-objective text-primary-foreground",
          activeLayer === 'objectives' && "ring-[3px] ring-primary ring-offset-4 ring-offset-background scale-[1.02] shadow-lg shadow-primary/20",
          activeLayer !== 'objectives' && "hover:scale-[1.01] hover:brightness-105"
        )}
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm font-semibold uppercase tracking-wide">Objectives</span>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {data.objectives.length === 0 ? (
            <span className="text-xs opacity-75">Add objectives...</span>
          ) : (
            data.objectives.map((obj, i) => (
              <ItemBadge
                key={obj.id}
                label={`O${i + 1}`}
                tooltip={getObjectiveDisplayName(obj) || 'Unnamed objective'}
                colorClass={objectiveColorMap.get(obj.id)?.bg || 'bg-muted-foreground'}
                hasIssue={hasIssue('objective', obj.id)}
                onClick={onItemClick ? () => onItemClick('objective', obj) : undefined}
              />
            ))
          )}
        </div>
      </button>

      {/* Strategies Layer */}
      <button
        onClick={() => onLayerClick('strategies')}
        className={cn(
          "relative flex flex-col items-center gap-3 px-6 py-4 rounded-xl transition-all duration-300",
          "w-[78%] bg-pyramid-strategy text-primary-foreground",
          activeLayer === 'strategies' && "ring-[3px] ring-primary ring-offset-4 ring-offset-background scale-[1.02] shadow-lg shadow-primary/20",
          activeLayer !== 'strategies' && "hover:scale-[1.01] hover:brightness-105"
        )}
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          <span className="text-sm font-semibold uppercase tracking-wide">Strategies</span>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {data.strategies.length === 0 ? (
            <span className="text-xs opacity-75">Define strategies...</span>
          ) : (
            data.strategies.map((str, i) => (
              <ItemBadge
                key={str.id}
                label={`S${i + 1}`}
                tooltip={getStrategyDisplayName(str) || 'Unnamed strategy'}
                colorClass={getStrategyColor(str.id)}
                hasIssue={hasIssue('strategy', str.id)}
                onClick={onItemClick ? () => onItemClick('strategy', str) : undefined}
              />
            ))
          )}
        </div>
      </button>

      {/* Tactics Layer */}
      <button
        onClick={() => onLayerClick('tactics')}
        className={cn(
          "relative flex flex-col items-center gap-3 px-6 py-4 rounded-xl transition-all duration-300",
          "w-[95%] bg-pyramid-tactic text-primary-foreground",
          activeLayer === 'tactics' && "ring-[3px] ring-primary ring-offset-4 ring-offset-background scale-[1.02] shadow-lg shadow-primary/20",
          activeLayer !== 'tactics' && "hover:scale-[1.01] hover:brightness-105"
        )}
      >
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4" />
          <span className="text-sm font-semibold uppercase tracking-wide">Tactics</span>
          <span className="text-xs opacity-75">({activeTactics} active · {completedTactics} done)</span>
        </div>
        <div className="flex flex-wrap justify-center gap-2 max-w-full">
          {data.tactics.filter(t => t.status !== 'cut').length === 0 ? (
            <span className="text-xs opacity-75">Add tactics...</span>
          ) : (
            data.tactics
              .filter(t => t.status !== 'cut')
              .map((tac, i) => (
                <ItemBadge
                  key={tac.id}
                  label={`T${i + 1}`}
                  tooltip={getTacticDisplayName(tac) || 'Unnamed tactic'}
                  colorClass={getTacticColor(tac.id)}
                  hasIssue={hasIssue('tactic', tac.id)}
                  isActive={tac.status === 'active' || tac.status === 'in_progress'}
                  status={tac.status}
                  onClick={onItemClick ? () => onItemClick('tactic', tac) : undefined}
                />
              ))
          )}
        </div>
      </button>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-border w-full space-y-3">
        {/* Objective colors */}
        {data.objectives.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3">
            {data.objectives.map((obj, i) => (
              <div key={obj.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className={cn("w-3 h-3 rounded-sm", objectiveColorMap.get(obj.id)?.bg)} />
                <span className="truncate max-w-24">{getObjectiveDisplayName(obj) || `Objective ${i + 1}`}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Status icons legend */}
        <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>Planned</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Play className="w-3 h-3 text-blue-500" />
            <span>Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Pause className="w-3 h-3 text-amber-500" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-success" />
            <span>Completed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
