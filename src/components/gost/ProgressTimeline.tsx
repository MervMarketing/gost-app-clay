import { useMemo } from 'react';
import { PulseCheck } from '@/types/gost';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Play, Flag, Circle } from 'lucide-react';

interface ProgressTimelineProps {
  startDate: string | null | undefined;
  pulseChecks: PulseCheck[];
  completedAt?: string | null;
  className?: string;
  onClickTimeline?: () => void;
}

export function ProgressTimeline({ 
  startDate, 
  pulseChecks, 
  completedAt,
  className,
  onClickTimeline
}: ProgressTimelineProps) {
  const timelineData = useMemo(() => {
    if (!startDate) return null;

    const start = new Date(startDate);
    const now = new Date();
    const end = completedAt ? new Date(completedAt) : now;
    const totalDays = Math.max(differenceInDays(end, start), 1);

    // Sort pulse checks by date
    const sortedPulses = [...pulseChecks].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );

    // Map pulse checks to positions
    const pulsePositions = sortedPulses.map(pulse => {
      const daysSinceStart = differenceInDays(new Date(pulse.recordedAt), start);
      const position = Math.min(Math.max((daysSinceStart / totalDays) * 100, 0), 100);
      return { ...pulse, position };
    });

    // Current position (now)
    const daysSinceStart = differenceInDays(now, start);
    const nowPosition = completedAt 
      ? 100 
      : Math.min((daysSinceStart / totalDays) * 100, 100);

    // Get current/latest progress
    const latestProgress = sortedPulses.length > 0 
      ? sortedPulses[sortedPulses.length - 1].progress 
      : 0;

    return {
      start,
      end,
      totalDays,
      pulsePositions,
      nowPosition,
      latestProgress,
      isComplete: !!completedAt
    };
  }, [startDate, pulseChecks, completedAt]);

  if (!timelineData) {
    return (
      <div className={cn("text-xs text-muted-foreground italic", className)}>
        No start date set
      </div>
    );
  }

  const { start, pulsePositions, nowPosition, latestProgress, isComplete, totalDays } = timelineData;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Timeline bar */}
      <div 
        className={cn("relative h-8", onClickTimeline && "cursor-pointer group/timeline")}
        onClick={onClickTimeline}
        title={onClickTimeline ? "Click to update progress" : undefined}
      >
        {/* Background track */}
        <div className={cn(
          "absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 bg-muted rounded-full transition-all",
          onClickTimeline && "group-hover/timeline:h-2"
        )} />
        
        {/* Progress fill */}
        <div 
          className={cn(
            "absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full left-0 transition-all",
            isComplete ? "bg-success" : "bg-primary"
          )}
          style={{ width: `${nowPosition}%` }}
        />

        {/* Start marker */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
              style={{ left: '0%' }}
            >
              <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground">
                <Play className="h-2.5 w-2.5 ml-0.5" />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">Started</p>
            <p className="text-xs text-muted-foreground">{format(start, 'MMM d, yyyy')}</p>
          </TooltipContent>
        </Tooltip>

        {/* Pulse check markers */}
        {pulsePositions.map((pulse, index) => (
          <Tooltip key={pulse.id}>
            <TooltipTrigger asChild>
              <div 
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 cursor-pointer"
                style={{ left: `${pulse.position}%` }}
              >
                <div className={cn(
                  "flex items-center justify-center h-4 w-4 rounded-full text-[9px] font-bold border-2 border-background",
                  pulse.progress === 100 
                    ? "bg-success text-success-foreground"
                    : pulse.progress >= 50
                    ? "bg-primary text-primary-foreground"
                    : "bg-amber-500 text-white"
                )}>
                  {pulse.progress === 100 ? '✓' : pulse.progress}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{pulse.progress}% complete</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(pulse.recordedAt), 'MMM d, yyyy')}
              </p>
              {pulse.note && (
                <p className="text-xs mt-1 max-w-48">{pulse.note}</p>
              )}
            </TooltipContent>
          </Tooltip>
        ))}

        {/* Now/End marker */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
              style={{ left: `${nowPosition}%` }}
            >
              <div className={cn(
                "flex items-center justify-center h-5 w-5 rounded-full",
                isComplete 
                  ? "bg-success text-success-foreground" 
                  : "bg-foreground text-background"
              )}>
                {isComplete ? (
                  <Flag className="h-2.5 w-2.5" />
                ) : (
                  <Circle className="h-2 w-2 fill-current" />
                )}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{isComplete ? 'Completed' : 'Now'}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), 'MMM d, yyyy')}
            </p>
            <p className="text-xs">
              {totalDays} day{totalDays !== 1 ? 's' : ''} since start
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Labels row */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground px-2">
        <span>{format(start, 'MMM d')}</span>
        <span className="font-medium text-foreground">
          {latestProgress}% → {isComplete ? 'Done' : 'Now'}
        </span>
        <span>{isComplete ? 'Done' : 'Today'}</span>
      </div>
    </div>
  );
}
