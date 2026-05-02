import { GOSTData } from '@/types/gost';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { normalizePlanTimeframe, PLAN_TIMEFRAME_OPTIONS, planTimeframeSelectLabel } from '@/lib/planTimeframe';

interface TimeframeSelectorProps {
  value: GOSTData['timeframe'];
  onChange: (value: GOSTData['timeframe']) => void;
}

export function TimeframeSelector({ value, onChange }: TimeframeSelectorProps) {
  const normalized = normalizePlanTimeframe(value);
  const currentLabel = planTimeframeSelectLabel(normalized);
  
  return (
    <Select value={normalized} onValueChange={(v) => onChange(v as GOSTData['timeframe'])}>
      <SelectTrigger className="h-10 w-auto gap-2 rounded-xl border border-border/80 bg-background text-sm font-medium shadow-none">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <SelectValue>{currentLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {PLAN_TIMEFRAME_OPTIONS.map((tf) => (
          <SelectItem key={tf.value} value={tf.value}>
            {tf.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
