import { AlertTriangle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AlignmentWarningProps {
  message?: string;
}

export function AlignmentWarning({ message = "This item does not currently support the level above it." }: AlignmentWarningProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-warning-muted cursor-help">
          <AlertTriangle className="w-3 h-3 text-warning" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-sm">
        <p>{message}</p>
      </TooltipContent>
    </Tooltip>
  );
}
