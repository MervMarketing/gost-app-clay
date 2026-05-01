import { ClientPriority, PRIORITY_CONFIG } from '@/lib/feedbackService';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ClientFeedbackBadgeProps {
  priority: ClientPriority;
  note?: string;
}

export function ClientFeedbackBadge({ priority, note }: ClientFeedbackBadgeProps) {
  const config = PRIORITY_CONFIG[priority];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0",
            config.bgColor,
            config.color
          )}
        >
          <span>{config.emoji}</span>
          <span className="hidden sm:inline">Client: {config.label}</span>
          <span className="sm:hidden">{config.label.split(' ')[0]}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-xs font-medium">Client rated: {config.label}</p>
        {note && <p className="text-xs text-muted-foreground mt-1">"{note}"</p>}
      </TooltipContent>
    </Tooltip>
  );
}
