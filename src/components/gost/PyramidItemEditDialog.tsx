import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Objective, Strategy, Tactic, TacticStatus } from '@/types/gost';
import { Trash2, Target, TrendingUp, CheckSquare, DollarSign, Calendar } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { getObjectiveDisplayName, getStrategyDisplayName } from '@/lib/gostDisplay';

interface PyramidItemEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: 'objective' | 'strategy' | 'tactic' | null;
  item: Objective | Strategy | Tactic | null;
  objectives: Objective[];
  strategies: Strategy[];
  onUpdateObjective: (id: string, updates: Partial<Objective>) => void;
  onUpdateStrategy: (id: string, updates: Partial<Strategy>) => void;
  onUpdateTactic: (id: string, updates: Partial<Tactic>) => void;
  onRemoveObjective: (id: string) => void;
  onRemoveStrategy: (id: string) => void;
  onRemoveTactic: (id: string) => void;
}

const statusLabels: Record<TacticStatus, string> = {
  planned: 'Planned',
  active: 'Active',
  in_progress: 'In Progress',
  completed: 'Completed',
  cut: 'Cut'
};

export function PyramidItemEditDialog({
  open,
  onOpenChange,
  itemType,
  item,
  objectives,
  strategies,
  onUpdateObjective,
  onUpdateStrategy,
  onUpdateTactic,
  onRemoveObjective,
  onRemoveStrategy,
  onRemoveTactic
}: PyramidItemEditDialogProps) {
  // Objective fields
  const [metricName, setMetricName] = useState('');
  const [baseline, setBaseline] = useState('');
  const [target, setTarget] = useState('');
  const [timeframe, setTimeframe] = useState('');

  // Strategy fields
  const [statement, setStatement] = useState('');
  const [strategyObjectiveId, setStrategyObjectiveId] = useState<string | null>(null);

  // Tactic fields
  const [description, setDescription] = useState('');
  const [tacticNotes, setTacticNotes] = useState('');
  const [tacticStatus, setTacticStatus] = useState<TacticStatus>('planned');
  const [tacticStrategyId, setTacticStrategyId] = useState('');
  const [hasBudget, setHasBudget] = useState(false);
  const [startedAt, setStartedAt] = useState<string | undefined>(undefined);
  const [completedAt, setCompletedAt] = useState<string | undefined>(undefined);

  // Reset form when item changes
  useEffect(() => {
    if (!item) return;

    if (itemType === 'objective') {
      const obj = item as Objective;
      const legacyTitle = (obj as unknown as { title?: string }).title;
      setMetricName(obj.metricName || legacyTitle || '');
      setBaseline(obj.baseline || '');
      setTarget(obj.target || '');
      setTimeframe(obj.timeframe || '');
    } else if (itemType === 'strategy') {
      const str = item as Strategy;
      const legacyTitle = (str as unknown as { title?: string }).title;
      setStatement(str.statement || legacyTitle || '');
      setStrategyObjectiveId(str.primaryObjectiveId || str.objectiveId || null);
    } else if (itemType === 'tactic') {
      const tac = item as Tactic;
      const legacyTitle = (tac as unknown as { title?: string }).title;
      setDescription(tac.description || legacyTitle || '');
      setTacticNotes(tac.notes || '');
      setTacticStatus(tac.status);
      setTacticStrategyId(tac.strategyId);
      setHasBudget(tac.hasBudget || false);
      setStartedAt(tac.startedAt);
      setCompletedAt(tac.completedAt);
    }
  }, [item, itemType]);

  const handleSave = () => {
    if (!item) return;

    if (itemType === 'objective') {
      onUpdateObjective(item.id, {
        metricName: metricName.trim(),
        baseline: baseline.trim(),
        target: target.trim(),
        timeframe: timeframe.trim()
      });
    } else if (itemType === 'strategy') {
      onUpdateStrategy(item.id, {
        statement: statement.trim(),
        primaryObjectiveId: strategyObjectiveId,
        objectiveId: strategyObjectiveId
      });
    } else if (itemType === 'tactic') {
      onUpdateTactic(item.id, {
        description: description.trim(),
        notes: tacticNotes.trim() || undefined,
        status: tacticStatus,
        strategyId: tacticStrategyId,
        hasBudget,
        startedAt,
        completedAt
      });
    }

    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!item) return;

    if (itemType === 'objective') {
      onRemoveObjective(item.id);
    } else if (itemType === 'strategy') {
      onRemoveStrategy(item.id);
    } else if (itemType === 'tactic') {
      onRemoveTactic(item.id);
    }

    onOpenChange(false);
  };

  const getIcon = () => {
    switch (itemType) {
      case 'objective':
        return <Target className="h-5 w-5 text-primary" />;
      case 'strategy':
        return <TrendingUp className="h-5 w-5 text-primary" />;
      case 'tactic':
        return <CheckSquare className="h-5 w-5 text-primary" />;
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (itemType) {
      case 'objective':
        return 'Edit Objective';
      case 'strategy':
        return 'Edit Strategy';
      case 'tactic':
        return 'Edit Tactic';
      default:
        return 'Edit Item';
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {itemType === 'objective' && (
            <>
              <div className="space-y-2">
                <Label>Metric Name</Label>
                <Input
                  value={metricName}
                  onChange={(e) => setMetricName(e.target.value)}
                  placeholder="What are you measuring?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Baseline</Label>
                  <Input
                    value={baseline}
                    onChange={(e) => setBaseline(e.target.value)}
                    placeholder="Current value"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target</Label>
                  <Input
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="Goal value"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Timeframe</Label>
                <Input
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  placeholder="e.g., Q1 2024"
                />
              </div>
            </>
          )}

          {itemType === 'strategy' && (
            <>
              <div className="space-y-2">
                <Label>Strategy Statement</Label>
                <Textarea
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  placeholder="What is this strategy?"
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Primary Objective</Label>
                <Select
                  value={strategyObjectiveId || 'none'}
                  onValueChange={(v) => setStrategyObjectiveId(v === 'none' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select objective..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None selected</SelectItem>
                    {objectives.map((obj) => (
                      <SelectItem key={obj.id} value={obj.id}>
                        {getObjectiveDisplayName(obj) || 'Unnamed objective'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {itemType === 'tactic' && (
            <>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this tactic?"
                  className="min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Notes (optional)</Label>
                <Textarea
                  value={tacticNotes}
                  onChange={(e) => setTacticNotes(e.target.value)}
                  placeholder="Add context or details about what this means..."
                  className="min-h-[60px] text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={tacticStatus} onValueChange={(v) => setTacticStatus(v as TacticStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Strategy</Label>
                  <Select value={tacticStrategyId} onValueChange={setTacticStrategyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select strategy..." />
                    </SelectTrigger>
                    <SelectContent>
                      {strategies.map((str) => (
                        <SelectItem key={str.id} value={str.id}>
                          {getStrategyDisplayName(str) || 'Unnamed strategy'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    Start Date
                  </Label>
                  <Input
                    type="datetime-local"
                    value={startedAt ? format(new Date(startedAt), "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setStartedAt(value ? new Date(value).toISOString() : undefined);
                    }}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    Completion Date
                  </Label>
                  <Input
                    type="datetime-local"
                    value={completedAt ? format(new Date(completedAt), "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCompletedAt(value ? new Date(value).toISOString() : undefined);
                    }}
                    className="text-sm"
                  />
                </div>
              </div>
              
              {/* Budget toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center h-8 w-8 rounded-md ${hasBudget ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-muted'}`}>
                    <DollarSign className={`h-4 w-4 ${hasBudget ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <div className="font-medium text-sm">External Budget</div>
                    <div className="text-xs text-muted-foreground">
                      Mark if this involves outsourced costs
                    </div>
                  </div>
                </div>
                <Switch
                  checked={hasBudget}
                  onCheckedChange={setHasBudget}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
