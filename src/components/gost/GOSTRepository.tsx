import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  GOSTData, 
  RepositoryItem, 
  RepositoryItemType, 
  RepositoryStatus,
  AbilityToExecute,
  ExecutionWindow,
  TacticStatus,
  Tactic
} from '@/types/gost';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  Plus, 
  X, 
  ArrowUpRight, 
  Lightbulb, 
  Target, 
  CheckSquare,
  Clock,
  Zap,
  Calendar,
  Archive,
  CheckCircle2,
  Ban,
  AlertTriangle,
  DollarSign,
  PlayCircle,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { formatDistanceToNow } from 'date-fns';
import { BulkAddDialog } from './BulkAddDialog';
import { BulkEditBar } from './BulkEditBar';
import { OrphanAssignmentDialog } from './OrphanAssignmentDialog';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RepositoryDashboard } from './RepositoryDashboard';
import { RepositoryItemEditDialog } from './RepositoryItemEditDialog';
import { Pencil } from 'lucide-react';
import { derivePriorityBucket, getEffectiveExecutionWindow, PRIORITY_BUCKET_CONFIG, PriorityBucket } from '@/lib/priorityBuckets';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function shortRepositoryId(id: string): string {
  if (id.length <= 14) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

interface GOSTRepositoryProps {
  data: GOSTData;
  onAdd: (item: Omit<RepositoryItem, 'id' | 'createdAt'>) => void;
  onBulkAdd: (items: Omit<RepositoryItem, 'id' | 'createdAt'>[]) => void;
  onUpdate: (id: string, updates: Partial<RepositoryItem>) => void;
  onUpdateTactic?: (id: string, updates: Partial<Tactic>) => void;
  onBulkUpdate: (ids: string[], updates: Partial<RepositoryItem>) => void;
  onRemove: (id: string) => void;
  onPromote: (id: string) => void;
  onAddObjective?: () => void;
  onUpdateObjective?: (id: string, updates: any) => void;
  onAddStrategy?: () => void;
  onUpdateStrategy?: (id: string, updates: any) => void;
  focusedItemId?: string | null;
  onClearFocus?: () => void;
  onSwitchToActivePlan?: (tacticDescription: string) => void;
}

const typeIcons: Record<RepositoryItemType, typeof Target> = {
  objective: Target,
  strategy: Lightbulb,
  tactic: CheckSquare
};

const typeLabels: Record<RepositoryItemType, string> = {
  objective: 'Objective',
  strategy: 'Strategy',
  tactic: 'Tactic'
};

const statusConfig: Record<RepositoryStatus, { color: string; label: string; icon: typeof Archive }> = {
  backlog: { color: 'bg-secondary text-secondary-foreground', label: 'Backlog', icon: Archive },
  queued: { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400', label: 'Queued', icon: Clock },
  promoted: { color: 'bg-success-muted text-success', label: 'Promoted', icon: ArrowUpRight },
  completed: { color: 'bg-success-muted text-success', label: 'Completed', icon: CheckCircle2 },
  cut: { color: 'bg-muted text-muted-foreground', label: 'Cut', icon: Ban }
};

const abilityLabels: Record<AbilityToExecute, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High'
};

interface RepositoryTableRowProps {
  item: RepositoryItem;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onUpdate: (id: string, updates: Partial<RepositoryItem>) => void;
  onRemove: (id: string) => void;
  onPromote: (id: string) => void;
  canPromote: boolean;
  getPromoteBlockers: () => string[];
  getObjectiveName: (id: string | null) => string;
  isOrphan: boolean;
  onAssignOutcome: () => void;
  priorityBucket: PriorityBucket;
  objectives: GOSTData['objectives'];
  isFocused?: boolean;
  itemRef?: (el: HTMLElement | null) => void;
  onSwitchToActivePlan?: (tacticDescription: string) => void;
  /** Hide outcome column when the table is already grouped by outcome */
  omitOutcomeColumn?: boolean;
}

function RepositoryTableRow({
  item,
  isSelected,
  onToggleSelection,
  onUpdate,
  onRemove,
  onPromote,
  canPromote,
  getPromoteBlockers,
  getObjectiveName,
  isOrphan,
  onAssignOutcome,
  priorityBucket,
  objectives,
  isFocused,
  itemRef,
  onSwitchToActivePlan,
  omitOutcomeColumn = false,
}: RepositoryTableRowProps) {
  const [editOpen, setEditOpen] = useState(false);
  const statusCfg = statusConfig[item.status];
  const StatusIcon = statusCfg.icon;
  const bucketConfig = PRIORITY_BUCKET_CONFIG[priorityBucket];
  const execWindow = getEffectiveExecutionWindow(item);
  const winLabel =
    execWindow === '30-day' ? '30d' : execWindow === '60-day' ? '60d' : '90d';

  return (
    <TableRow
      ref={(el) => itemRef?.(el)}
      className={cn(
        isFocused && 'bg-primary/5 ring-1 ring-inset ring-primary/25',
        isSelected && 'bg-muted/50',
        item.status === 'cut' && 'opacity-60',
        isOrphan && 'bg-warning-muted/15',
      )}
    >
      <TableCell className="w-10 align-middle" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelection(item.id)}
          className="h-4 w-4"
        />
      </TableCell>
      <TableCell className="max-w-[min(36vw,18rem)] align-middle">
        <div className="line-clamp-2 text-sm font-medium text-foreground">{item.description}</div>
        {item.notes && (
          <div className="mt-0.5 line-clamp-1 text-[0.65rem] text-muted-foreground">{item.notes}</div>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap align-middle">
        <div className="flex flex-col items-start gap-1">
          <Badge className={cn('gap-0.5 text-[10px]', statusCfg.color)}>
            <StatusIcon className="h-3 w-3" />
            {statusCfg.label}
          </Badge>
          {item.status !== 'cut' &&
            item.status !== 'promoted' &&
            item.status !== 'completed' && (
              <Badge variant="outline" className={cn('gap-0.5 text-[10px]', bucketConfig.color)}>
                {bucketConfig.emoji} {bucketConfig.label}
              </Badge>
            )}
        </div>
      </TableCell>
      {!omitOutcomeColumn && (
        <TableCell className="hidden max-w-[10rem] align-middle sm:table-cell">
          {isOrphan ? (
            <Button
              variant="link"
              className="h-auto p-0 text-xs text-warning"
              onClick={(e) => {
                e.stopPropagation();
                onAssignOutcome();
              }}
            >
              Assign outcome
            </Button>
          ) : (
            <span className="line-clamp-2 text-xs text-muted-foreground">
              {getObjectiveName(item.outcomeSupported)}
            </span>
          )}
        </TableCell>
      )}
      <TableCell className="hidden align-middle text-[0.7rem] text-muted-foreground md:table-cell">
        <div className="flex flex-col gap-0.5">
          <span>{winLabel}</span>
          <span className="capitalize">{abilityLabels[item.abilityToExecute]}</span>
          {item.hasBudget && (
            <span className="flex items-center gap-0.5 text-success">
              <DollarSign className="h-3 w-3" /> Budget
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="align-middle">
        <code className="font-mono text-[0.65rem] text-muted-foreground" title={item.id}>
          {shortRepositoryId(item.id)}
        </code>
      </TableCell>
      <TableCell className="text-right align-middle" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit details
            </DropdownMenuItem>
            {isOrphan && (
              <DropdownMenuItem onClick={onAssignOutcome}>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Assign outcome
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {item.status === 'backlog' && (
              <DropdownMenuItem onClick={() => onUpdate(item.id, { status: 'queued' })}>
                <Clock className="mr-2 h-4 w-4" />
                Queue for review
              </DropdownMenuItem>
            )}
            {item.status === 'queued' && (
              <>
                <DropdownMenuItem onClick={() => onUpdate(item.id, { status: 'backlog' })}>
                  <Archive className="mr-2 h-4 w-4" />
                  Back to backlog
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!canPromote}
                  onClick={() => canPromote && onPromote(item.id)}
                  title={!canPromote ? getPromoteBlockers().join('; ') : undefined}
                >
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  Promote
                </DropdownMenuItem>
              </>
            )}
            {item.status === 'promoted' && onSwitchToActivePlan && (
              <DropdownMenuItem onClick={() => onSwitchToActivePlan(item.description)}>
                <PlayCircle className="mr-2 h-4 w-4" />
                View in Active Plan
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {item.status !== 'cut' ? (
              <DropdownMenuItem onClick={() => onUpdate(item.id, { status: 'cut' })}>
                <Ban className="mr-2 h-4 w-4" />
                Move to history
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onUpdate(item.id, { status: 'backlog' })}>
                Restore from history
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
      <TableCell className="sr-only w-0 min-w-0 overflow-hidden border-0 p-0 align-middle">
        <RepositoryItemEditDialog
          item={item}
          open={editOpen}
          onOpenChange={setEditOpen}
          objectives={objectives}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      </TableCell>
    </TableRow>
  );
}

type GroupByOption = 'flat' | 'outcome' | 'strategy';

/** What people come here to do — not database statuses. */
type RepositoryMainView = 'parking' | 'live' | 'triage' | 'done' | 'overview';

/** Optional lens while grooming the parking lot (priority buckets). */
type ParkingLens = 'everything' | 'quick-wins' | 'phase-2' | 'later';

interface AddItemDialogProps {
  objectives: GOSTData['objectives'];
  onAdd: (item: Omit<RepositoryItem, 'id' | 'createdAt'>) => void;
}

const executionWindowLabels: Record<ExecutionWindow, string> = {
  '30-day': '30 Days (Now)',
  '60-day': '60 Days (Next)',
  '90-day': '90 Days (Later)'
};

const tacticStatusLabels: Record<TacticStatus, string> = {
  planned: 'Planned',
  active: 'Active',
  in_progress: 'In Progress',
  completed: 'Completed',
  cut: 'Cut'
};

function AddItemDialog({ objectives, onAdd }: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [outcomeSupported, setOutcomeSupported] = useState<string | null>(null);
  const [abilityToExecute, setAbilityToExecute] = useState<AbilityToExecute>('medium');
  const [hasBudget, setHasBudget] = useState(false);
  const [executionWindow, setExecutionWindow] = useState<ExecutionWindow>('90-day');
  const [tacticStatus, setTacticStatus] = useState<TacticStatus>('planned');

  const handleSubmit = () => {
    if (!description.trim()) return;
    
    onAdd({
      type: 'tactic', // Parking Lot only supports tactics
      description,
      notes: notes.trim() || undefined,
      outcomeSupported,
      // Keep deprecated fields with defaults for backward compatibility
      growthStage: 'scaling',
      companyContext: 'small_team',
      timeHorizon: executionWindow === '30-day' ? 'short' : executionWindow === '60-day' ? 'medium' : 'long',
      abilityToExecute,
      status: 'backlog',
      hasBudget,
      executionWindow,
      tacticStatus
    });
    
    // Reset form
    setDescription('');
    setNotes('');
    setOutcomeSupported(null);
    setAbilityToExecute('medium');
    setHasBudget(false);
    setExecutionWindow('90-day');
    setTacticStatus('planned');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Add Item</TooltipContent>
      </Tooltip>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Tactic to Backlog</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label>Title</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this tactic?"
              className="min-h-[60px]"
            />
          </div>

          {/* Notes - renamed label */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Why this exists / what done means (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="1-2 sentences on intent and success criteria..."
              className="min-h-[60px] text-sm"
            />
          </div>

          {/* Primary Outcome Supported */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-primary" />
              Primary Outcome Supported
            </Label>
            <Select value={outcomeSupported || 'none'} onValueChange={(v) => setOutcomeSupported(v === 'none' ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select outcome..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None selected</SelectItem>
                {objectives.map((obj) => (
                  <SelectItem key={obj.id} value={obj.id}>
                    {obj.metricName || 'Unnamed objective'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Execution Window & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
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
                Status
              </Label>
              <Select value={tacticStatus} onValueChange={(v) => setTacticStatus(v as TacticStatus)}>
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

          {/* Budget toggle */}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!description.trim()}>Add Item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GOSTRepository({ 
  data, 
  onAdd, 
  onBulkAdd, 
  onUpdate,
  onUpdateTactic,
  onBulkUpdate, 
  onRemove, 
  onPromote,
  onAddObjective,
  onUpdateObjective,
  onAddStrategy,
  onUpdateStrategy,
  focusedItemId,
  onClearFocus,
  onSwitchToActivePlan
}: GOSTRepositoryProps) {
  const [mainView, setMainView] = useState<RepositoryMainView>('live');
  const [parkingLens, setParkingLens] = useState<ParkingLens>('everything');
  const [typeFilter, setTypeFilter] = useState<'all' | RepositoryItemType>('all');
  const [groupBy, setGroupBy] = useState<GroupByOption>('outcome');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [orphanDialogItem, setOrphanDialogItem] = useState<RepositoryItem | null>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  const listFilter = useMemo(() => {
    if (mainView === 'overview') return 'dashboard' as const;
    if (mainView === 'live') return 'promoted' as const;
    if (mainView === 'done') return 'history' as const;
    if (mainView === 'triage') return 'fix-first' as const;
    if (parkingLens === 'everything') return 'all' as const;
    return parkingLens;
  }, [mainView, parkingLens]);

  const viewHelperLine = useMemo(() => {
    switch (mainView) {
      case 'overview':
        return 'Snapshot of flow, risk, and balance across the repository.';
      case 'parking':
        if (parkingLens === 'everything') {
          return 'Backlog and queued ideas — not yet promoted to the active plan.';
        }
        return `Showing only ${PRIORITY_BUCKET_CONFIG[parkingLens].label} items.`;
      case 'live':
        return 'What is promoted and in motion against your outcomes.';
      case 'triage':
        return 'Fix broken links and shaky bets before they clutter the plan.';
      case 'done':
        return 'Completed or cut work — for reference and learning.';
      default:
        return '';
    }
  }, [mainView, parkingLens]);

  // Handle focused item - switch to correct view and scroll
  useEffect(() => {
    if (!focusedItemId) return;
    
    const item = data.repository.find(i => i.id === focusedItemId);
    if (!item) return;
    
    if (item.status === 'promoted') {
      setMainView('live');
    } else if (item.status === 'completed' || item.status === 'cut') {
      setMainView('done');
    } else {
      setMainView('parking');
      setParkingLens('everything');
    }
    
    // Scroll to the item after a short delay for filter change to take effect
    setTimeout(() => {
      const element = itemRefs.current.get(focusedItemId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    
    // Clear focus after 3 seconds
    const timer = setTimeout(() => {
      onClearFocus?.();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [focusedItemId, data.repository, onClearFocus]);

  // Active objective IDs for priority bucket calculation
  const activeObjectiveIds = useMemo(() => new Set(data.objectives.map(o => o.id)), [data.objectives]);

  const needsReviewItems = useMemo(() => 
    data.repository.filter(item => {
      if (item.status === 'cut' || item.status === 'promoted' || item.status === 'completed') return false;
      // Missing outcome
      if (!item.outcomeSupported) return true;
      // Outcome no longer exists
      if (!data.objectives.some(o => o.id === item.outcomeSupported)) return true;
      // Low confidence: low ability + 90-day window (use executionWindow)
      const execWindow = getEffectiveExecutionWindow(item);
      if (item.abilityToExecute === 'low' && execWindow === '90-day') return true;
      return false;
    }),
    [data.repository, data.objectives]
  );

  // Priority bucket counts
  const priorityBucketCounts = useMemo(() => {
    const counts: Record<PriorityBucket, number> = {
      'quick-wins': 0,
      'phase-2': 0,
      'later': 0,
      'cut-candidate': 0
    };
    
    data.repository.forEach(item => {
      if (item.status === 'cut' || item.status === 'promoted' || item.status === 'completed') return;
      const bucket = derivePriorityBucket(item, activeObjectiveIds);
      counts[bucket]++;
    });
    
    return counts;
  }, [data.repository, activeObjectiveIds]);

  const filteredItems = useMemo(() => {
    return data.repository.filter(item => {
      const f = listFilter;

      if (f === 'fix-first') {
        if (item.status === 'cut' || item.status === 'promoted' || item.status === 'completed') return false;
        if (!item.outcomeSupported) return true;
        if (!data.objectives.some(o => o.id === item.outcomeSupported)) return true;
        const execWindow = getEffectiveExecutionWindow(item);
        if (item.abilityToExecute === 'low' && execWindow === '90-day') return true;
        return false;
      }

      if (f === 'orphans') {
        return !item.outcomeSupported && 
          item.status !== 'cut' && 
          item.status !== 'promoted' &&
          item.status !== 'completed';
      }
      if (f === 'needs-review') {
        if (item.status === 'cut' || item.status === 'promoted' || item.status === 'completed') return false;
        if (!item.outcomeSupported) return true;
        if (!data.objectives.some(o => o.id === item.outcomeSupported)) return true;
        const execWindow = getEffectiveExecutionWindow(item);
        if (item.abilityToExecute === 'low' && execWindow === '90-day') return true;
        return false;
      }
      
      if (f === 'quick-wins' || f === 'phase-2' || f === 'later') {
        if (item.status === 'cut' || item.status === 'promoted' || item.status === 'completed') return false;
        const bucket = derivePriorityBucket(item, activeObjectiveIds);
        return bucket === f;
      }
      
      let statusMatch = false;
      if (f === 'all') statusMatch = item.status === 'backlog' || item.status === 'queued';
      else if (f === 'history') statusMatch = item.status === 'completed' || item.status === 'cut';
      else statusMatch = item.status === f;
      
      const typeMatch = typeFilter === 'all' || item.type === typeFilter;
      
      return statusMatch && typeMatch;
    });
  }, [data.repository, data.objectives, listFilter, typeFilter, activeObjectiveIds]);

  // Group items by outcome or strategy
  const groupedItems = useMemo(() => {
    if (groupBy === 'flat') {
      return { 'all': filteredItems };
    }
    
    if (groupBy === 'outcome') {
      const groups: Record<string, RepositoryItem[]> = {};
      const unassigned: RepositoryItem[] = [];
      
      filteredItems.forEach(item => {
        if (!item.outcomeSupported) {
          unassigned.push(item);
        } else {
          const key = item.outcomeSupported;
          if (!groups[key]) groups[key] = [];
          groups[key].push(item);
        }
      });
      
      // Sort by objective order
      const orderedGroups: Record<string, RepositoryItem[]> = {};
      data.objectives.forEach(obj => {
        if (groups[obj.id]) {
          orderedGroups[obj.id] = groups[obj.id];
        }
      });
      
      if (unassigned.length > 0) {
        orderedGroups['unassigned'] = unassigned;
      }
      
      return orderedGroups;
    }
    
    if (groupBy === 'strategy') {
      const groups: Record<string, RepositoryItem[]> = {};
      const unassigned: RepositoryItem[] = [];
      
      // For tactics with outcome, group under strategies
      filteredItems.forEach(item => {
        if (!item.outcomeSupported) {
          unassigned.push(item);
        } else {
          // Find strategies for this outcome
          const strategyForOutcome = data.strategies.find(s => s.objectiveId === item.outcomeSupported);
          if (strategyForOutcome) {
            const key = strategyForOutcome.id;
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
          } else {
            unassigned.push(item);
          }
        }
      });
      
      if (unassigned.length > 0) {
        groups['unassigned'] = unassigned;
      }
      
      return groups;
    }
    
    return { 'all': filteredItems };
  }, [filteredItems, groupBy, data.objectives, data.strategies]);

  // Selected items that are currently visible
  const selectedItems = useMemo(() => 
    filteredItems.filter(item => selectedIds.has(item.id)),
    [filteredItems, selectedIds]
  );

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredItems.map(i => i.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const isGroupFullySelected = (items: RepositoryItem[]) =>
    items.length > 0 && items.every((i) => selectedIds.has(i.id));

  const getGroupSelectionState = (items: RepositoryItem[]) => {
    if (items.length === 0) return false as const;
    if (items.every((i) => selectedIds.has(i.id))) return true as const;
    if (items.some((i) => selectedIds.has(i.id))) return 'indeterminate' as const;
    return false as const;
  };

  const getVisibleSelectionState = () => {
    if (filteredItems.length === 0) return false as const;
    if (filteredItems.every((i) => selectedIds.has(i.id))) return true as const;
    if (filteredItems.some((i) => selectedIds.has(i.id))) return 'indeterminate' as const;
    return false as const;
  };

  const toggleGroupSelection = (items: RepositoryItem[]) => {
    const allOn = isGroupFullySelected(items);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOn) {
        items.forEach((i) => next.delete(i.id));
      } else {
        items.forEach((i) => next.add(i.id));
      }
      return next;
    });
  };

  const getPromoteBlockers = (item: RepositoryItem): string[] => {
    const blockers: string[] = [];
    if (item.status !== 'queued') blockers.push('Item must be queued first');
    if (item.outcomeSupported === null) blockers.push('Must be linked to a 90-day outcome');
    else if (!data.objectives.some(o => o.id === item.outcomeSupported)) blockers.push('Linked outcome no longer exists');
    if (item.type === 'tactic') {
      // Check if there's a strategy for this outcome
      const hasStrategy = data.strategies.some(s => s.objectiveId === item.outcomeSupported);
      if (!hasStrategy) blockers.push('No strategy exists for this outcome');
      // Use execution window instead of legacy time horizon
      const execWindow = getEffectiveExecutionWindow(item);
      if (execWindow === '90-day') blockers.push('Execution window must be 30 or 60 days');
    }
    if (item.abilityToExecute === 'low') blockers.push('Ability to execute is too low');
    return blockers;
  };

  const canPromote = (item: RepositoryItem): boolean => {
    return getPromoteBlockers(item).length === 0;
  };

  const getObjectiveName = (id: string | null): string => {
    if (!id) return 'No outcome linked';
    const obj = data.objectives.find(o => o.id === id);
    return obj?.metricName || 'Unknown objective';
  };

  const getStrategyName = (id: string): string => {
    const str = data.strategies.find(s => s.id === id);
    return str?.statement || 'Unknown strategy';
  };

  const getGroupLabel = (key: string): string => {
    if (key === 'all') return 'All Items';
    if (key === 'unassigned') return '⚠️ Unassigned (Orphans)';
    if (groupBy === 'outcome') return getObjectiveName(key);
    if (groupBy === 'strategy') return getStrategyName(key);
    return key;
  };

  const allVisibleSelected = filteredItems.length > 0 && filteredItems.every(i => selectedIds.has(i.id));

  const isOrphan = (item: RepositoryItem): boolean => {
    return !item.outcomeSupported;
  };

  const showGroupedView = groupBy !== 'flat' && listFilter !== 'dashboard';

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold tracking-tight text-foreground sm:text-lg">All tactics</h2>
        <div className="flex items-center gap-1">
          <BulkAddDialog 
            objectives={data.objectives}
            strategies={data.strategies}
            onAdd={(items) => {
              onBulkAdd(items);
              toast.success(`Added ${items.length} items`);
            }} 
          />
          <AddItemDialog objectives={data.objectives} onAdd={onAdd} />
        </div>
      </div>

      {/* Views: job-to-be-done modes + parking lens + layout */}
      <div className="-mx-3 px-3 sm:mx-0 sm:px-0">
        <div className="rounded-2xl border border-border/80 bg-card p-3 shadow-subtle">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">What are you doing?</Label>
            <ToggleGroup
              type="single"
              value={mainView}
              onValueChange={(v) => v && setMainView(v as RepositoryMainView)}
              className="flex flex-wrap justify-start gap-1.5"
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="overview" className="rounded-lg px-2.5 text-xs sm:text-sm">
                Overview
              </ToggleGroupItem>
              <ToggleGroupItem value="parking" className="rounded-lg px-2.5 text-xs sm:text-sm">
                Parking lot
              </ToggleGroupItem>
              <ToggleGroupItem value="live" className="rounded-lg px-2.5 text-xs sm:text-sm">
                On plan
              </ToggleGroupItem>
              <ToggleGroupItem value="triage" className="rounded-lg px-2.5 text-xs sm:text-sm">
                Fix first
                {needsReviewItems.length > 0 ? (
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-[1.25rem] px-1.5 tabular-nums text-[10px]">
                    {needsReviewItems.length}
                  </Badge>
                ) : null}
              </ToggleGroupItem>
              <ToggleGroupItem value="done" className="rounded-lg px-2.5 text-xs sm:text-sm">
                Done & cut
              </ToggleGroupItem>
            </ToggleGroup>

            {mainView === 'parking' && (
              <div className="flex flex-col gap-1.5 border-t border-border/60 pt-3">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Focus inside parking</Label>
                <ToggleGroup
                  type="single"
                  value={parkingLens}
                  onValueChange={(v) => v && setParkingLens(v as ParkingLens)}
                  className="flex flex-wrap justify-start gap-1.5"
                  variant="outline"
                  size="sm"
                >
                  <ToggleGroupItem value="everything" className="rounded-lg px-2.5 text-xs sm:text-sm">
                    Everything
                  </ToggleGroupItem>
                  <ToggleGroupItem value="quick-wins" className="rounded-lg px-2.5 text-xs sm:text-sm">
                    {PRIORITY_BUCKET_CONFIG['quick-wins'].emoji} Quick wins
                    <span className="ml-1 tabular-nums text-muted-foreground">({priorityBucketCounts['quick-wins']})</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="phase-2" className="rounded-lg px-2.5 text-xs sm:text-sm">
                    {PRIORITY_BUCKET_CONFIG['phase-2'].emoji} Phase 2
                    <span className="ml-1 tabular-nums text-muted-foreground">({priorityBucketCounts['phase-2']})</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="later" className="rounded-lg px-2.5 text-xs sm:text-sm">
                    {PRIORITY_BUCKET_CONFIG['later'].emoji} Later
                    <span className="ml-1 tabular-nums text-muted-foreground">({priorityBucketCounts['later']})</span>
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            )}

            <p className="text-xs leading-snug text-muted-foreground">{viewHelperLine}</p>

            {listFilter !== 'dashboard' && (
              <div className="flex flex-col gap-2 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
                {groupBy === 'strategy' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">Stacked under strategy</span>
                    <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setGroupBy('outcome')}>
                      Use goal stacks
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setGroupBy('flat')}>
                      Flat list
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <Switch
                      id="stack-under-goals"
                      checked={groupBy === 'outcome'}
                      onCheckedChange={(on) => setGroupBy(on ? 'outcome' : 'flat')}
                    />
                    <Label htmlFor="stack-under-goals" className="cursor-pointer text-sm font-normal">
                      Stack under goals
                    </Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground"
                          aria-label="More layout options"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => setGroupBy('strategy')}>Stack under strategy instead</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard view */}
      {listFilter === 'dashboard' && (
        <RepositoryDashboard 
          data={data} 
          onUpdateTactic={onUpdateTactic}
          onUpdateRepositoryItem={onUpdate}
        />
      )}

      {/* Empty state */}
      {listFilter !== 'dashboard' && filteredItems.length === 0 && (
        <div className="rounded-2xl border border-border/80 bg-card py-12 text-center shadow-subtle">
          <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No items found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {listFilter === 'fix-first'
              ? 'Nothing needs fixing right now — links and review rules look good.'
              : listFilter === 'orphans'
                ? 'All items have outcomes assigned.'
                : listFilter === 'needs-review'
                  ? 'All visible items are properly configured.'
                  : 'Add ideas for future objectives, strategies, and tactics here.'}
          </p>
        </div>
      )}

      {/* Select all row - only when there are items and not on dashboard */}
      {listFilter !== 'dashboard' && filteredItems.length > 0 && (
        <div 
          className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/80 bg-muted/30 p-3 transition-colors hover:bg-muted/50 md:hidden"
          onClick={() => allVisibleSelected ? clearSelection() : selectAll()}
        >
          <Checkbox
            checked={getVisibleSelectionState()}
            onCheckedChange={(checked) =>
              checked === true ? selectAll() : clearSelection()
            }
            className="h-5 w-5"
          />
          <div className="flex-1">
            <p className="text-sm font-medium">Select All ({filteredItems.length} items)</p>
            {selectedIds.size > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedIds.size} selected — use the bar below to bulk edit
              </p>
            )}
          </div>
        </div>
      )}

      {/* Items - Grouped or Flat */}
      {listFilter !== 'dashboard' && filteredItems.length > 0 && (
        showGroupedView ? (
          <div className="space-y-8">
            {Object.entries(groupedItems).map(([groupKey, items]) => (
              <div key={groupKey} className="space-y-3">
                <div
                  className={cn(
                    'flex items-center gap-2 border-b pb-2',
                    groupKey === 'unassigned' ? 'border-warning/30' : 'border-border/70',
                  )}
                >
                  {groupBy === 'outcome' && <Target className="h-4 w-4 text-foreground/80" />}
                  {groupBy === 'strategy' && <Lightbulb className="h-4 w-4 text-foreground/80" />}
                  <h3
                    className={cn(
                      'font-display text-sm font-semibold tracking-tight sm:text-base',
                      groupKey === 'unassigned' && 'text-warning',
                    )}
                  >
                    {getGroupLabel(groupKey)}
                  </h3>
                  <Badge variant="secondary" className="ml-auto tabular-nums">
                    {items.length}
                  </Badge>
                </div>

                <div className="hidden overflow-hidden rounded-2xl border border-border/80 bg-card shadow-subtle md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/70 hover:bg-transparent">
                        <TableHead className="w-10">
                          <Checkbox
                            checked={getGroupSelectionState(items)}
                            onCheckedChange={() => toggleGroupSelection(items)}
                            className="h-4 w-4"
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select all in ${getGroupLabel(groupKey)}`}
                          />
                        </TableHead>
                        <TableHead>Tactic</TableHead>
                        <TableHead className="min-w-[7rem]">Status</TableHead>
                        {groupBy !== 'outcome' && (
                          <TableHead className="hidden min-w-[8rem] sm:table-cell">Outcome</TableHead>
                        )}
                        <TableHead className="hidden md:table-cell">Window · Ability</TableHead>
                        <TableHead className="min-w-[5.5rem]">ID</TableHead>
                        <TableHead className="w-12 text-right"> </TableHead>
                        <TableHead className="sr-only w-0 min-w-0 p-0">Dialog</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <RepositoryTableRow
                          key={item.id}
                          item={item}
                          isSelected={selectedIds.has(item.id)}
                          onToggleSelection={toggleSelection}
                          onUpdate={onUpdate}
                          onRemove={onRemove}
                          onPromote={onPromote}
                          canPromote={canPromote(item)}
                          getPromoteBlockers={() => getPromoteBlockers(item)}
                          getObjectiveName={getObjectiveName}
                          isOrphan={isOrphan(item)}
                          onAssignOutcome={() => setOrphanDialogItem(item)}
                          priorityBucket={derivePriorityBucket(item, activeObjectiveIds)}
                          objectives={data.objectives}
                          isFocused={focusedItemId === item.id}
                          itemRef={(el) => {
                            if (el) itemRefs.current.set(item.id, el);
                            else itemRefs.current.delete(item.id);
                          }}
                          onSwitchToActivePlan={onSwitchToActivePlan}
                          omitOutcomeColumn={groupBy === 'outcome'}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:hidden">
                  {items.map((item) => (
                    <RepositoryCard
                      key={item.id}
                      item={item}
                      isSelected={selectedIds.has(item.id)}
                      onToggleSelection={toggleSelection}
                      onUpdate={onUpdate}
                      onRemove={onRemove}
                      onPromote={onPromote}
                      canPromote={canPromote(item)}
                      getPromoteBlockers={() => getPromoteBlockers(item)}
                      getObjectiveName={getObjectiveName}
                      isOrphan={isOrphan(item)}
                      onAssignOutcome={() => setOrphanDialogItem(item)}
                      priorityBucket={derivePriorityBucket(item, activeObjectiveIds)}
                      objectives={data.objectives}
                      isFocused={focusedItemId === item.id}
                      itemRef={(el) => {
                        if (el) itemRefs.current.set(item.id, el);
                        else itemRefs.current.delete(item.id);
                      }}
                      onSwitchToActivePlan={onSwitchToActivePlan}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-border/80 bg-card shadow-subtle md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/70 hover:bg-transparent">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={getVisibleSelectionState()}
                        onCheckedChange={(checked) =>
                          checked === true ? selectAll() : clearSelection()
                        }
                        className="h-4 w-4"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Select all visible items"
                      />
                    </TableHead>
                    <TableHead>Tactic</TableHead>
                    <TableHead className="min-w-[7rem]">Status</TableHead>
                    <TableHead className="hidden min-w-[8rem] sm:table-cell">Outcome</TableHead>
                    <TableHead className="hidden md:table-cell">Window · Ability</TableHead>
                    <TableHead className="min-w-[5.5rem]">ID</TableHead>
                    <TableHead className="w-12 text-right"> </TableHead>
                    <TableHead className="sr-only w-0 min-w-0 p-0">Dialog</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <RepositoryTableRow
                      key={item.id}
                      item={item}
                      isSelected={selectedIds.has(item.id)}
                      onToggleSelection={toggleSelection}
                      onUpdate={onUpdate}
                      onRemove={onRemove}
                      onPromote={onPromote}
                      canPromote={canPromote(item)}
                      getPromoteBlockers={() => getPromoteBlockers(item)}
                      getObjectiveName={getObjectiveName}
                      isOrphan={isOrphan(item)}
                      onAssignOutcome={() => setOrphanDialogItem(item)}
                      priorityBucket={derivePriorityBucket(item, activeObjectiveIds)}
                      objectives={data.objectives}
                      isFocused={focusedItemId === item.id}
                      itemRef={(el) => {
                        if (el) itemRefs.current.set(item.id, el);
                        else itemRefs.current.delete(item.id);
                      }}
                      onSwitchToActivePlan={onSwitchToActivePlan}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:hidden sm:grid-cols-2">
              {filteredItems.map((item) => (
                <RepositoryCard
                  key={item.id}
                  item={item}
                  isSelected={selectedIds.has(item.id)}
                  onToggleSelection={toggleSelection}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                  onPromote={onPromote}
                  canPromote={canPromote(item)}
                  getPromoteBlockers={() => getPromoteBlockers(item)}
                  getObjectiveName={getObjectiveName}
                  isOrphan={isOrphan(item)}
                  onAssignOutcome={() => setOrphanDialogItem(item)}
                  priorityBucket={derivePriorityBucket(item, activeObjectiveIds)}
                  objectives={data.objectives}
                  isFocused={focusedItemId === item.id}
                  itemRef={(el) => {
                    if (el) itemRefs.current.set(item.id, el);
                    else itemRefs.current.delete(item.id);
                  }}
                  onSwitchToActivePlan={onSwitchToActivePlan}
                />
              ))}
            </div>
          </>
        )
      )}

      {/* Bulk Edit Bar */}
      {selectedItems.length > 0 && (
        <BulkEditBar
          selectedItems={selectedItems}
          objectives={data.objectives}
          onUpdate={onBulkUpdate}
          onClearSelection={clearSelection}
        />
      )}

      {/* Orphan Assignment Dialog */}
      {orphanDialogItem && (
        <OrphanAssignmentDialog
          open={!!orphanDialogItem}
          onOpenChange={(open) => !open && setOrphanDialogItem(null)}
          item={orphanDialogItem}
          objectives={data.objectives}
          strategies={data.strategies}
          onUpdateItem={onUpdate}
          onAddObjective={onAddObjective || (() => {})}
          onUpdateObjective={onUpdateObjective || (() => {})}
          onAddStrategy={onAddStrategy || (() => {})}
          onUpdateStrategy={onUpdateStrategy || (() => {})}
        />
      )}

      {/* Philosophy reminder */}
      <div className="text-center py-6 border-t border-border">
        <p className="text-xs text-muted-foreground italic">
          Ideas are cheap. Execution is selective.
        </p>
      </div>
    </div>
  );
}

// Extracted card component for reuse
interface RepositoryCardProps {
  item: RepositoryItem;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onUpdate: (id: string, updates: Partial<RepositoryItem>) => void;
  onRemove: (id: string) => void;
  onPromote: (id: string) => void;
  canPromote: boolean;
  getPromoteBlockers: () => string[];
  getObjectiveName: (id: string | null) => string;
  isOrphan: boolean;
  onAssignOutcome: () => void;
  priorityBucket: PriorityBucket;
  objectives: GOSTData['objectives'];
  isFocused?: boolean;
  itemRef?: (el: HTMLElement | null) => void;
  onSwitchToActivePlan?: (tacticDescription: string) => void;
}

function RepositoryCard({
  item,
  isSelected,
  onToggleSelection,
  onUpdate,
  onRemove,
  onPromote,
  canPromote,
  getPromoteBlockers,
  getObjectiveName,
  isOrphan,
  onAssignOutcome,
  priorityBucket,
  objectives,
  isFocused,
  itemRef,
  onSwitchToActivePlan
}: RepositoryCardProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(item.description);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const TypeIcon = typeIcons[item.type];
  const statusCfg = statusConfig[item.status];
  const StatusIcon = statusCfg.icon;
  
  const handleDescriptionSave = () => {
    if (editedDescription.trim() && editedDescription !== item.description) {
      onUpdate(item.id, { description: editedDescription.trim() });
    } else {
      setEditedDescription(item.description);
    }
    setIsEditingDescription(false);
  };
  
  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleDescriptionSave();
    } else if (e.key === 'Escape') {
      setEditedDescription(item.description);
      setIsEditingDescription(false);
    }
  };
  const bucketConfig = PRIORITY_BUCKET_CONFIG[priorityBucket];

  return (
    <div 
      ref={itemRef}
      className={cn(
        "group relative p-4 rounded-lg border bg-card hover:border-primary/30 transition-all",
        item.status === 'cut' && 'opacity-60',
        isSelected && 'border-primary ring-1 ring-primary/20',
        isOrphan && 'border-warning/50',
        isFocused && 'ring-2 ring-primary border-primary bg-primary/5 shadow-lg shadow-primary/20'
      )}
    >
      {/* Selection checkbox */}
      <div 
        className="absolute top-3 left-3 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelection(item.id)}
          className="h-4 w-4 bg-background"
        />
      </div>

      {/* Type, Status & Priority badges */}
      <div className="flex items-center justify-between mb-3 pl-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="gap-1">
            <TypeIcon className="h-3 w-3" />
            {typeLabels[item.type]}
          </Badge>
          <Badge className={cn("gap-1", statusCfg.color)}>
            <StatusIcon className="h-3 w-3" />
            {statusCfg.label}
          </Badge>
          {/* Priority bucket badge - only show for non-terminal states */}
          {item.status !== 'cut' && item.status !== 'promoted' && item.status !== 'completed' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={cn("gap-1 text-[10px]", bucketConfig.color)}>
                  {bucketConfig.emoji} {bucketConfig.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{bucketConfig.description}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Edit button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit details</TooltipContent>
          </Tooltip>
          
          {item.status !== 'cut' ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100"
              onClick={() => onUpdate(item.id, { status: 'cut' })}
              title="Move to History (can restore later)"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 opacity-0 group-hover:opacity-100 text-xs"
              onClick={() => onUpdate(item.id, { status: 'backlog' })}
            >
              Restore
            </Button>
          )}
        </div>
      </div>

      {/* Description - inline editable */}
      {isEditingDescription ? (
        <input
          type="text"
          value={editedDescription}
          onChange={(e) => setEditedDescription(e.target.value)}
          onBlur={handleDescriptionSave}
          onKeyDown={handleDescriptionKeyDown}
          autoFocus
          className="w-full text-sm text-foreground font-medium mb-1 pl-6 pr-2 py-1 bg-background border border-primary rounded focus:outline-none focus:ring-1 focus:ring-primary"
        />
      ) : (
        <p 
          className="text-sm text-foreground font-medium mb-1 line-clamp-2 pl-6 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -ml-1 transition-colors"
          onClick={() => {
            setEditedDescription(item.description);
            setIsEditingDescription(true);
          }}
          title="Click to edit"
        >
          {item.description}
        </p>
      )}
      
      {/* Notes - smaller caption text */}
      {item.notes && (
        <p className="text-xs text-muted-foreground mb-3 pl-6 line-clamp-2 italic">
          {item.notes}
        </p>
      )}
      
      {!item.notes && <div className="mb-2" />}

      {/* Linked outcome - with orphan indicator */}
      <div className="flex items-center gap-1.5 text-xs mb-3 pl-6">
        {isOrphan ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1 text-warning hover:text-warning"
            onClick={onAssignOutcome}
          >
            <AlertTriangle className="h-3 w-3" />
            Needs Outcome — Assign
          </Button>
        ) : (
          <>
            <Target className="h-3 w-3 text-primary" />
            <span className="truncate text-muted-foreground">{getObjectiveName(item.outcomeSupported)}</span>
          </>
        )}
      </div>

      {/* Metadata pills - simplified to show key info only */}
      <div className="flex flex-wrap gap-1 text-[10px] mb-3 pl-6">
        {/* Execution Window */}
        <span className="px-1.5 py-0.5 rounded bg-muted flex items-center gap-0.5">
          <Clock className="h-2.5 w-2.5" />
          {getEffectiveExecutionWindow(item) === '30-day' ? '30d' : 
           getEffectiveExecutionWindow(item) === '60-day' ? '60d' : '90d'}
        </span>
        {/* Ability to Execute */}
        <span className={cn(
          "px-1.5 py-0.5 rounded flex items-center gap-0.5",
          item.abilityToExecute === 'high' ? 'bg-success-muted text-success' :
          item.abilityToExecute === 'medium' ? 'bg-warning-muted text-warning' :
          'bg-destructive/10 text-destructive'
        )}>
          <Zap className="h-2.5 w-2.5" />
          {abilityLabels[item.abilityToExecute]}
        </span>
        {/* Tactic Status if set */}
        {item.tacticStatus && item.tacticStatus !== 'planned' && (
          <span className="px-1.5 py-0.5 rounded bg-muted">
            {item.tacticStatus === 'active' ? 'Active' : 
             item.tacticStatus === 'in_progress' ? 'WIP' :
             item.tacticStatus === 'completed' ? 'Done' : 'Cut'}
          </span>
        )}
        {/* Budget indicator */}
        {item.hasBudget && (
          <span className="px-1.5 py-0.5 rounded bg-success-muted text-success flex items-center gap-0.5">
            <DollarSign className="h-2.5 w-2.5" />
          </span>
        )}
      </div>

      {/* Created date */}
      <p className="text-[10px] text-muted-foreground mb-3 pl-6">
        Added {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
      </p>

      {/* Actions */}
      {item.status !== 'promoted' && item.status !== 'completed' && item.status !== 'cut' && (
        <div className="flex items-center gap-2 pl-6">
          {item.status === 'backlog' && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => onUpdate(item.id, { status: 'queued' })}
            >
              Queue for Review
            </Button>
          )}
          {item.status === 'queued' && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onUpdate(item.id, { status: 'backlog' })}
              >
                Back to Backlog
              </Button>
              {canPromote ? (
                <Button 
                  size="sm"
                  className="flex-1"
                  onClick={() => onPromote(item.id)}
                >
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  Promote
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex-1">
                      <Button 
                        size="sm"
                        className="w-full"
                        disabled
                      >
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                        Promote
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="font-medium mb-1">Cannot promote yet:</p>
                    <ul className="text-xs list-disc pl-4 space-y-0.5">
                      {getPromoteBlockers().map((blocker, i) => (
                        <li key={i}>{blocker}</li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              )}
            </>
          )}
        </div>
      )}

      {/* View in Active Plan link - for promoted items */}
      {item.status === 'promoted' && onSwitchToActivePlan && (
        <div className="mt-3 pt-3 border-t border-border/50 pl-6">
          <button
            onClick={() => onSwitchToActivePlan(item.description)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <PlayCircle className="h-3 w-3" />
            <span>View in Active Plan</span>
          </button>
        </div>
      )}

      {/* Edit Dialog */}
      <RepositoryItemEditDialog
        item={item}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        objectives={objectives}
        onUpdate={onUpdate}
        onRemove={onRemove}
      />
    </div>
  );
}
