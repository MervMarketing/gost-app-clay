import { useState } from 'react';
import { 
  RepositoryItem, 
  RepositoryStatus,
  GrowthStage, 
  AbilityToExecute, 
  TimeHorizon,
  Objective 
} from '@/types/gost';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  X, 
  Target,
  Zap,
  Calendar,
  Archive,
  Clock,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BulkEditBarProps {
  selectedItems: RepositoryItem[];
  objectives: Objective[];
  onUpdate: (ids: string[], updates: Partial<RepositoryItem>) => void;
  onClearSelection: () => void;
}

const statusOptions: { value: RepositoryStatus; label: string; icon: typeof Archive }[] = [
  { value: 'backlog', label: 'Backlog', icon: Archive },
  { value: 'queued', label: 'Queued', icon: Clock },
  { value: 'cut', label: 'Cut', icon: Trash2 },
];

const abilityLabels: Record<AbilityToExecute, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High'
};

const timeHorizonLabels: Record<TimeHorizon, string> = {
  short: 'Short (< 2 wks)',
  medium: 'Medium (2-6 wks)',
  long: 'Long (6+ wks)'
};

const growthStageLabels: Record<GrowthStage, string> = {
  early: 'Early',
  scaling: 'Scaling',
  optimization: 'Optimization'
};

export function BulkEditBar({ 
  selectedItems, 
  objectives, 
  onUpdate, 
  onClearSelection 
}: BulkEditBarProps) {
  const ids = selectedItems.map(i => i.id);
  const count = selectedItems.length;

  const handleStatusChange = (status: RepositoryStatus) => {
    onUpdate(ids, { status });
    toast.success(`Updated ${count} items to ${status}`);
  };

  const handleAbilityChange = (abilityToExecute: AbilityToExecute) => {
    onUpdate(ids, { abilityToExecute });
    toast.success(`Set ability to "${abilityLabels[abilityToExecute]}" for ${count} items`);
  };

  const handleTimeHorizonChange = (timeHorizon: TimeHorizon) => {
    onUpdate(ids, { timeHorizon });
    toast.success(`Set time horizon to "${timeHorizonLabels[timeHorizon]}" for ${count} items`);
  };

  const handleOutcomeChange = (outcomeSupported: string | null) => {
    onUpdate(ids, { outcomeSupported });
    const label = outcomeSupported 
      ? objectives.find(o => o.id === outcomeSupported)?.metricName || 'Unknown'
      : 'None';
    toast.success(`Linked ${count} items to "${label}"`);
  };

  const handleGrowthStageChange = (growthStage: GrowthStage) => {
    onUpdate(ids, { growthStage });
    toast.success(`Set growth stage to "${growthStageLabels[growthStage]}" for ${count} items`);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-card border border-border rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-200">
        {/* Count & Clear */}
        <div className="flex items-center gap-2 pr-3 border-r border-border">
          <span className="text-sm font-medium text-foreground">
            {count} selected
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClearSelection}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Status:</span>
          <Select onValueChange={(v) => handleStatusChange(v as RepositoryStatus)}>
            <SelectTrigger className="h-8 w-[100px] text-xs">
              <SelectValue placeholder="Change..." />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <opt.icon className="h-3 w-3" />
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 90-Day Outcome */}
        <div className="flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-primary" />
          <Select onValueChange={(v) => handleOutcomeChange(v === 'none' ? null : v)}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Link outcome..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-xs">None</SelectItem>
              {objectives.map(obj => (
                <SelectItem key={obj.id} value={obj.id} className="text-xs">
                  {obj.metricName || 'Unnamed'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ability to Execute */}
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-muted-foreground" />
          <Select onValueChange={(v) => handleAbilityChange(v as AbilityToExecute)}>
            <SelectTrigger className="h-8 w-[90px] text-xs">
              <SelectValue placeholder="Ability..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(abilityLabels).map(([value, label]) => (
                <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Time Horizon */}
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <Select onValueChange={(v) => handleTimeHorizonChange(v as TimeHorizon)}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="Time..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(timeHorizonLabels).map(([value, label]) => (
                <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Growth Stage */}
        <div className="flex items-center gap-1.5">
          <Select onValueChange={(v) => handleGrowthStageChange(v as GrowthStage)}>
            <SelectTrigger className="h-8 w-[100px] text-xs">
              <SelectValue placeholder="Stage..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(growthStageLabels).map(([value, label]) => (
                <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
