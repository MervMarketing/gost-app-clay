import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  RepositoryItem, 
  RepositoryItemType, 
  RepositoryStatus,
  AbilityToExecute,
  ExecutionWindow,
  TacticStatus,
  Objective
} from '@/types/gost';
import { Target, Trash2, DollarSign, Zap, Clock, Info, CheckSquare } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { 
  derivePriorityBucket, 
  getEffectiveExecutionWindow,
  getPriorityWhyLine,
  PRIORITY_BUCKET_CONFIG 
} from '@/lib/priorityBuckets';
import { getObjectiveDisplayName } from '@/lib/gostDisplay';

interface RepositoryItemEditDialogProps {
  item: RepositoryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectives: Objective[];
  onUpdate: (id: string, updates: Partial<RepositoryItem>) => void;
  onRemove: (id: string) => void;
}

const typeLabels: Record<RepositoryItemType, string> = {
  objective: 'Objective',
  strategy: 'Strategy',
  tactic: 'Tactic'
};

const statusLabels: Record<RepositoryStatus, string> = {
  backlog: 'Backlog',
  queued: 'Queued',
  promoted: 'Promoted',
  completed: 'Completed',
  cut: 'Cut'
};

const abilityLabels: Record<AbilityToExecute, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High'
};

const executionWindowLabels: Record<ExecutionWindow, string> = {
  '30-day': '30 Days (Now)',
  '60-day': '60 Days (Next)',
  '90-day': '90 Days (Later)'
};

const tacticStatusLabels: Record<TacticStatus, string> = {
  planned: 'Planned',
  active: 'Active',
  in_progress: 'In Progress',
  completed: 'Done',
  cut: 'Cut'
};

export function RepositoryItemEditDialog({
  item,
  open,
  onOpenChange,
  objectives,
  onUpdate,
  onRemove
}: RepositoryItemEditDialogProps) {
  const [description, setDescription] = useState(item.description);
  const [notes, setNotes] = useState(item.notes || '');
  const [outcomeSupported, setOutcomeSupported] = useState<string | null>(item.outcomeSupported);
  const [abilityToExecute, setAbilityToExecute] = useState<AbilityToExecute>(item.abilityToExecute);
  const [status, setStatus] = useState<RepositoryStatus>(item.status);
  const [hasBudget, setHasBudget] = useState(item.hasBudget || false);
  const [executionWindow, setExecutionWindow] = useState<ExecutionWindow>(getEffectiveExecutionWindow(item));
  const [tacticStatus, setTacticStatus] = useState<TacticStatus>(item.tacticStatus || 'planned');

  // Reset form when item changes
  useEffect(() => {
    setDescription(item.description);
    setNotes(item.notes || '');
    setOutcomeSupported(item.outcomeSupported);
    setAbilityToExecute(item.abilityToExecute);
    setStatus(item.status);
    setHasBudget(item.hasBudget || false);
    setExecutionWindow(getEffectiveExecutionWindow(item));
    setTacticStatus(item.tacticStatus || 'planned');
  }, [item]);

  // Auto-sync: when tactic status changes, update backlog stage accordingly
  const handleTacticStatusChange = (newTacticStatus: TacticStatus) => {
    setTacticStatus(newTacticStatus);
    
    // Auto-promote when setting to Active or In Progress
    if (newTacticStatus === 'active' || newTacticStatus === 'in_progress') {
      setStatus('promoted');
    }
    // Auto-complete when setting to Done
    if (newTacticStatus === 'completed') {
      setStatus('completed');
    }
    // Auto-cut when setting to Cut
    if (newTacticStatus === 'cut') {
      setStatus('cut');
    }
  };

  // Calculate priority bucket preview
  const activeObjectiveIds = useMemo(() => new Set(objectives.map(o => o.id)), [objectives]);
  
  const previewItem: RepositoryItem = useMemo(() => ({
    ...item,
    outcomeSupported,
    abilityToExecute,
    executionWindow,
    hasBudget,
    status
  }), [item, outcomeSupported, abilityToExecute, executionWindow, hasBudget, status]);

  const priorityBucket = derivePriorityBucket(previewItem, activeObjectiveIds);
  const bucketConfig = PRIORITY_BUCKET_CONFIG[priorityBucket];
  const whyLine = getPriorityWhyLine(previewItem, activeObjectiveIds);

  const handleSave = () => {
    // Map execution window back to legacy timeHorizon for backwards compatibility
    const timeHorizon = executionWindow === '30-day' ? 'short' : executionWindow === '60-day' ? 'medium' : 'long';
    
    onUpdate(item.id, {
      description: description.trim(),
      notes: notes.trim() || undefined,
      outcomeSupported,
      abilityToExecute,
      timeHorizon, // Keep for backwards compatibility
      status,
      hasBudget: item.type === 'tactic' ? hasBudget : undefined,
      executionWindow,
      tacticStatus: item.type === 'tactic' ? tacticStatus : undefined
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    onRemove(item.id);
    onOpenChange(false);
  };

  const hasChanges = 
    description !== item.description ||
    notes !== (item.notes || '') ||
    outcomeSupported !== item.outcomeSupported ||
    abilityToExecute !== item.abilityToExecute ||
    status !== item.status ||
    executionWindow !== getEffectiveExecutionWindow(item) ||
    tacticStatus !== (item.tacticStatus || 'planned') ||
    (item.type === 'tactic' && hasBudget !== (item.hasBudget || false));

  const isTerminalState = status === 'cut' || status === 'promoted' || status === 'completed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit {typeLabels[item.type]}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Description */}
          <div className="space-y-2">
            <Label>Title</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this item about?"
              className="min-h-[60px]"
            />
          </div>

          {/* Notes/Context - renamed label */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">
              Why this exists / what done means (optional)
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="1-2 sentences on intent and success criteria..."
              className="min-h-[60px] text-sm"
            />
          </div>

          {/* Backlog Stage (formerly Repository Status) */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Backlog Stage</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as RepositoryStatus)}>
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

          {/* Tactic-specific: Execution Window & Tactic Status */}
          {item.type === 'tactic' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  Execution Window
                </Label>
                <Select value={executionWindow} onValueChange={(v) => setExecutionWindow(v as ExecutionWindow)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(executionWindowLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CheckSquare className="h-3.5 w-3.5" />
                  Tactic Status
                </Label>
                <Select value={tacticStatus} onValueChange={(v) => handleTacticStatusChange(v as TacticStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tacticStatusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Linked Outcome */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-primary" />
              Primary Outcome Supported
            </Label>
            <Select 
              value={outcomeSupported || 'none'} 
              onValueChange={(v) => setOutcomeSupported(v === 'none' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select outcome..." />
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

          {/* Ability to Execute */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5" />
              Ability to Execute
            </Label>
            <Select value={abilityToExecute} onValueChange={(v) => setAbilityToExecute(v as AbilityToExecute)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(abilityLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority Bucket Preview - Read-only computed */}
          {!isTerminalState && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Priority Bucket (computed)</span>
                <Badge className={cn("text-xs", bucketConfig.color, bucketConfig.bgColor)}>
                  {bucketConfig.emoji} {bucketConfig.label}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Info className="h-3 w-3" />
                {whyLine}
              </div>
            </div>
          )}

          {/* Budget toggle - only for tactics */}
          {item.type === 'tactic' && (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-md",
                  hasBudget ? 'bg-success-muted' : 'bg-muted'
                )}>
                  <DollarSign className={cn(
                    "h-4 w-4",
                    hasBudget ? 'text-success' : 'text-muted-foreground'
                  )} />
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
            <Button onClick={handleSave} disabled={!description.trim()}>
              {hasChanges ? 'Save Changes' : 'Close'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
