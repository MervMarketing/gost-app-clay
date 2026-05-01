import { useState, useEffect, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  RepositoryItem, 
  Objective, 
  ExecutionWindow, 
  TacticStatus,
  AbilityToExecute,
  PulseCheck,
  PulseFrequency
} from '@/types/gost';
import { cn } from '@/lib/utils';
import { 
  derivePriorityBucket, 
  getEffectiveExecutionWindow,
  getPriorityWhyLine,
  PRIORITY_BUCKET_CONFIG 
} from '@/lib/priorityBuckets';
import { createPulseCheck, getCurrentProgress, deriveRotLevel } from '@/lib/pulseCheck';
import { RotIndicator } from './RotIndicator';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  Target, 
  DollarSign, 
  Trash2,
  Zap,
  Clock,
  FileText,
  Settings,
  TrendingUp,
  Info
} from 'lucide-react';
import { ProgressTimeline } from './ProgressTimeline';
import { getObjectiveDisplayName } from '@/lib/gostDisplay';

interface TacticDetailDrawerProps {
  item: RepositoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectives: Objective[];
  activeObjectiveIds: Set<string>;
  pulseFrequency: PulseFrequency;
  onUpdate: (id: string, updates: Partial<RepositoryItem>) => void;
  onRemove: (id: string) => void;
}

const TACTIC_STATUS_OPTIONS: { value: TacticStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Done' },
  { value: 'cut', label: 'Cut' }
];

const EXECUTION_WINDOW_OPTIONS: { value: ExecutionWindow; label: string }[] = [
  { value: '30-day', label: '30 Days (Now)' },
  { value: '60-day', label: '60 Days (Next)' },
  { value: '90-day', label: '90 Days (Later)' }
];

const ABILITY_OPTIONS: { value: AbilityToExecute; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const PROGRESS_OPTIONS = [0, 25, 50, 75, 100] as const;

export function TacticDetailDrawer({
  item,
  open,
  onOpenChange,
  objectives,
  activeObjectiveIds,
  pulseFrequency,
  onUpdate,
  onRemove
}: TacticDetailDrawerProps) {
  // Form state
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<TacticStatus>('planned');
  const [executionWindow, setExecutionWindow] = useState<ExecutionWindow>('90-day');
  const [outcomeSupported, setOutcomeSupported] = useState<string | null>(null);
  const [abilityToExecute, setAbilityToExecute] = useState<AbilityToExecute>('medium');
  const [hasBudget, setHasBudget] = useState(false);
  const [selectedProgress, setSelectedProgress] = useState<0 | 25 | 50 | 75 | 100>(0);
  const [progressNote, setProgressNote] = useState('');

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      setNotes(item.notes || '');
      setStatus(item.tacticStatus || 'planned');
      setExecutionWindow(getEffectiveExecutionWindow(item));
      setOutcomeSupported(item.outcomeSupported);
      setAbilityToExecute(item.abilityToExecute);
      setHasBudget(item.hasBudget || false);
      setSelectedProgress(0);
      setProgressNote('');
    }
  }, [item]);

  // Compute derived values
  const priorityBucket = useMemo(() => {
    if (!item) return 'later';
    // Create a preview item with current form state
    const previewItem: RepositoryItem = {
      ...item,
      outcomeSupported,
      abilityToExecute,
      executionWindow,
      hasBudget
    };
    return derivePriorityBucket(previewItem, activeObjectiveIds);
  }, [item, outcomeSupported, abilityToExecute, executionWindow, hasBudget, activeObjectiveIds]);

  const bucketConfig = PRIORITY_BUCKET_CONFIG[priorityBucket];

  const whyLine = useMemo(() => {
    if (!item) return '';
    const previewItem: RepositoryItem = {
      ...item,
      outcomeSupported,
      abilityToExecute,
      executionWindow,
      hasBudget
    };
    return getPriorityWhyLine(previewItem, activeObjectiveIds);
  }, [item, outcomeSupported, abilityToExecute, executionWindow, hasBudget, activeObjectiveIds]);

  // Use actual pulse checks from item
  const pulseChecks: PulseCheck[] = item?.pulseChecks ?? [];

  const mockTactic = useMemo(() => ({
    id: item?.id || '',
    description: item?.description || '',
    status: status,
    strategyId: '',
    executionWindow,
    pulseChecks,
    startedAt: item?.promotedAt
  }), [item, status, executionWindow, pulseChecks]);

  const rotLevel = deriveRotLevel(mockTactic, pulseFrequency);
  const currentProgress = getCurrentProgress(mockTactic);
  const isActive = status === 'active' || status === 'in_progress';
  const isTerminalState = status === 'completed' || status === 'cut';

  if (!item) return null;

  const handleSave = () => {
    onUpdate(item.id, {
      notes: notes.trim() || undefined,
      tacticStatus: status,
      executionWindow,
      outcomeSupported,
      abilityToExecute,
      hasBudget
    });
    onOpenChange(false);
  };

  const handleAddPulseCheck = () => {
    if (selectedProgress === 0 && !progressNote.trim()) return;
    
    const newPulseCheck = createPulseCheck(selectedProgress, progressNote);
    const updatedPulseChecks = [...pulseChecks, newPulseCheck];
    
    const updates: Partial<RepositoryItem> = {
      pulseChecks: updatedPulseChecks,
    };
    
    // Auto-complete if 100%
    if (selectedProgress === 100) {
      updates.tacticStatus = 'completed';
      updates.completedAt = new Date().toISOString();
    }
    
    onUpdate(item.id, updates);
    setSelectedProgress(0);
    setProgressNote('');
  };

  const handleDelete = () => {
    onRemove(item.id);
    onOpenChange(false);
  };

  const hasChanges = 
    notes !== (item.notes || '') ||
    status !== (item.tacticStatus || 'planned') ||
    executionWindow !== getEffectiveExecutionWindow(item) ||
    outcomeSupported !== item.outcomeSupported ||
    abilityToExecute !== item.abilityToExecute ||
    hasBudget !== (item.hasBudget || false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto px-4 sm:px-6">
        <SheetHeader className="pb-3 sm:pb-4">
          <SheetTitle className="text-left pr-8 text-base sm:text-lg">
            {item.description}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            Added {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </p>
        </SheetHeader>

        <div className="space-y-5 sm:space-y-6">
          {/* Section A: Why & Definition */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" />
              Why & Definition
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Why this exists / what done means (1-2 sentences)
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe the intent and success criteria..."
                className="min-h-[70px] sm:min-h-[80px] text-sm"
              />
            </div>
          </div>

          <Separator />

          {/* Section B: Execution Controls */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground">
              <Settings className="h-4 w-4" />
              Execution Controls
            </div>
            
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TacticStatus)}>
                  <SelectTrigger className="h-10 sm:h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TACTIC_STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Window
                </Label>
                <Select value={executionWindow} onValueChange={(v) => setExecutionWindow(v as ExecutionWindow)}>
                  <SelectTrigger className="h-10 sm:h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXECUTION_WINDOW_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Progress update - only for active tactics */}
            {isActive && (
              <div className="p-3 rounded-lg bg-muted/50 border space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Update Progress
                  </Label>
                  <div className="flex items-center gap-1">
                    <RotIndicator rotLevel={rotLevel} />
                    <span className="text-xs text-muted-foreground">
                      Current: {currentProgress}%
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-1">
                  {PROGRESS_OPTIONS.map(p => (
                    <Button
                      key={p}
                      variant={selectedProgress === p ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => setSelectedProgress(p)}
                    >
                      {p}%
                    </Button>
                  ))}
                </div>

                <Textarea
                  value={progressNote}
                  onChange={(e) => setProgressNote(e.target.value)}
                  placeholder="Add a note (optional)..."
                  className="min-h-[60px] text-xs"
                />

                <Button 
                  size="sm" 
                  className="w-full"
                  disabled={selectedProgress === 0 && !progressNote.trim()}
                  onClick={handleAddPulseCheck}
                >
                  Record Progress
                </Button>
              </div>
            )}

            {/* Progress Timeline Visualization */}
            {(isActive || isTerminalState) && item?.promotedAt && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Progress Timeline</Label>
                <div className="p-3 rounded-lg border bg-background">
                  <ProgressTimeline
                    startDate={item.promotedAt}
                    pulseChecks={pulseChecks}
                    completedAt={status === 'completed' ? item.completedAt : null}
                  />
                </div>
              </div>
            )}

            {/* Pulse Check History */}
            {pulseChecks.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Pulse Check History</Label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {pulseChecks.slice().reverse().map((pulse) => (
                    <div key={pulse.id} className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded">
                      <span className="font-medium">{pulse.progress}%</span>
                      {pulse.note && <span className="text-muted-foreground truncate mx-2">{pulse.note}</span>}
                      <span className="text-muted-foreground shrink-0">
                        {format(new Date(pulse.recordedAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Section C: Alignment */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Target className="h-4 w-4" />
              Alignment
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">Primary Outcome Supported</Label>
              <Select 
                value={outcomeSupported || 'none'} 
                onValueChange={(v) => setOutcomeSupported(v === 'none' ? null : v)}
              >
                <SelectTrigger className="h-9">
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
          </div>

          <Separator />

          {/* Section D: Effort & Priority */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Zap className="h-4 w-4" />
              Effort & Priority
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">Ability to Execute</Label>
              <Select value={abilityToExecute} onValueChange={(v) => setAbilityToExecute(v as AbilityToExecute)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ABILITY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority Bucket - Read-only computed */}
            {!isTerminalState && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Priority Bucket (computed)</span>
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
          </div>

          <Separator />

          {/* Section E: Budget */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Budget
            </div>
            
            <div className="flex items-center justify-between rounded-lg border p-3">
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
                    Involves outsourced costs
                  </div>
                </div>
              </div>
              <Switch
                checked={hasBudget}
                onCheckedChange={setHasBudget}
              />
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-2 pt-2 pb-4 sm:pb-2">
            <Button 
              variant="ghost" 
              size="default"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 sm:h-9"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none h-10 sm:h-9">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!hasChanges} className="flex-1 sm:flex-none h-10 sm:h-9">
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
