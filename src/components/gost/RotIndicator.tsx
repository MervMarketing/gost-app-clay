import { cn } from '@/lib/utils';
import { RotLevel } from '@/types/gost';
import { getRotTooltip } from '@/lib/pulseCheck';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface RotIndicatorProps {
  rotLevel: RotLevel;
  className?: string;
}

const rotColors: Record<RotLevel, string> = {
  fresh: 'bg-emerald-500',
  slowing: 'bg-amber-500',
  stalled: 'bg-red-500'
};

export function RotIndicator({ rotLevel, className }: RotIndicatorProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(
          "w-2 h-2 rounded-full shrink-0",
          rotColors[rotLevel],
          className
        )} />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {getRotTooltip(rotLevel)}
      </TooltipContent>
    </Tooltip>
  );
}
