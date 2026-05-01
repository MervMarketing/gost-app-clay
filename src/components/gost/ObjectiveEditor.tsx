import { Objective, ObjectiveUpdate } from '@/types/gost';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { AlignmentWarning } from './AlignmentWarning';
import { ObjectiveUpdates } from './ObjectiveUpdates';

interface ObjectiveEditorProps {
  objective: Objective;
  onChange: (id: string, updates: Partial<Objective>) => void;
  onRemove: (id: string) => void;
  hasIssue: boolean;
  issueMessage?: string;
  canRemove: boolean;
}

export function ObjectiveEditor({
  objective,
  onChange,
  onRemove,
  hasIssue,
  issueMessage,
  canRemove
}: ObjectiveEditorProps) {
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
      
      <div className="grid gap-3">
        <div className="flex items-start justify-between gap-3">
          <Input
            value={objective.metricName}
            onChange={(e) => onChange(objective.id, { metricName: e.target.value })}
            placeholder="Metric name (e.g., Orders per day)"
            className="font-medium"
          />
          {canRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 shrink-0"
              onClick={() => onRemove(objective.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Baseline</label>
            <Input
              value={objective.baseline}
              onChange={(e) => onChange(objective.id, { baseline: e.target.value })}
              placeholder="Current value"
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Target</label>
            <Input
              value={objective.target}
              onChange={(e) => onChange(objective.id, { target: e.target.value })}
              placeholder="Goal value"
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Timeframe</label>
            <Input
              value={objective.timeframe}
              onChange={(e) => onChange(objective.id, { timeframe: e.target.value })}
              placeholder="e.g., 90 days"
              className="text-sm"
            />
          </div>
        </div>
        
        <ObjectiveUpdates
          updates={objective.updates || []}
          onAddUpdate={(update: ObjectiveUpdate) => {
            onChange(objective.id, {
              updates: [...(objective.updates || []), update]
            });
          }}
        />
      </div>
    </div>
  );
}
