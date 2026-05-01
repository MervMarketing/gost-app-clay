import { GOSTData } from '@/types/gost';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';

interface TimeframeSelectorProps {
  value: GOSTData['timeframe'];
  onChange: (value: GOSTData['timeframe']) => void;
}

const timeframes: { value: GOSTData['timeframe']; label: string }[] = [
  { value: '90-day', label: '90 Days' },
  { value: '6-month', label: '6 Months' },
  { value: '12-month', label: '12 Months' },
];

export function TimeframeSelector({ value, onChange }: TimeframeSelectorProps) {
  const currentLabel = timeframes.find(tf => tf.value === value)?.label || '90 Days';
  
  return (
    <Select value={value} onValueChange={(v) => onChange(v as GOSTData['timeframe'])}>
      <SelectTrigger className="h-10 w-auto gap-2 rounded-xl border border-border/80 bg-background text-sm font-medium shadow-none">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <SelectValue>{currentLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {timeframes.map((tf) => (
          <SelectItem key={tf.value} value={tf.value}>
            {tf.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
