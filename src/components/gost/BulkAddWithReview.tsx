import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ListPlus, Check, Trash2, AlertTriangle, CheckCircle2, Target, ChevronRight, ArrowRight, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Objective, Strategy } from '@/types/gost';
import { suggestObjectiveForDescription } from '@/lib/priorityBuckets';
import { getObjectiveDisplayName, getStrategyDisplayName } from '@/lib/gostDisplay';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ParsedItemWithObjective {
  id: string;
  text: string;
  selected: boolean;
  primaryObjectiveId: string | null;
  strategyId?: string | null;
  suggestedObjectiveId: string | null;
  confidence: 'suggested' | 'low' | 'none';
  matchedKeywords: string[];
}

interface BulkAddWithReviewProps {
  itemType: 'strategy' | 'tactic';
  objectives: Objective[];
  strategies?: Strategy[];
  onAdd: (items: { 
    text: string; 
    primaryObjectiveId: string | null;
    strategyId?: string;
  }[]) => void;
  maxItems?: number;
  currentCount: number;
  trigger?: React.ReactNode;
}

type BulkAddStep = 'input' | 'objectives' | 'strategies';

export function BulkAddWithReview({ 
  itemType, 
  objectives,
  strategies = [],
  onAdd, 
  maxItems,
  currentCount,
  trigger 
}: BulkAddWithReviewProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<BulkAddStep>('input');
  const [rawText, setRawText] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedItemWithObjective[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const itemLabel = itemType === 'strategy' ? 'strategy' : 'tactic';
  const itemLabelPlural = itemType === 'strategy' ? 'strategies' : 'tactics';
  const placeholder = itemType === 'strategy' 
    ? `Enter strategies, one per line:

- Buyer-First Funnel Simplification
- Activation Before Acquisition
- Lifecycle Automation
- Template-Driven Ordering
• Repeat Order Acceleration`
    : `Enter tactics, one per line:

- Simplify checkout flow
- Add progress indicators to onboarding
- Create email drip campaign
- Build template library
• Implement auto-reorder feature`;

  const remainingSlots = maxItems ? maxItems - currentCount : Infinity;

  // Parse raw text into items with objective suggestions
  const handleParse = () => {
    const lines = rawText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim())
      .filter(line => line.length > 0);
    
    const items: ParsedItemWithObjective[] = lines.map((line, index) => {
      const suggestion = suggestObjectiveForDescription(line, objectives);
      
      return {
        id: `bulk-${index}-${Date.now()}`,
        text: line,
        selected: index < remainingSlots,
        primaryObjectiveId: null, // Never auto-assign - require user confirmation
        strategyId: null,
        suggestedObjectiveId: suggestion?.objectiveId ?? null,
        confidence: suggestion?.confidence ?? 'none',
        matchedKeywords: suggestion?.matchedKeywords ?? []
      };
    });
    
    setParsedItems(items);
    
    // For strategies, go directly to objective assignment
    // For tactics, also go to objective assignment first (two-step flow)
    setStep('objectives');
  };

  const toggleItem = (id: string) => {
    const currentSelected = parsedItems.filter(i => i.selected).length;
    setParsedItems(items => 
      items.map(item => {
        if (item.id !== id) return item;
        if (!item.selected && currentSelected >= remainingSlots) return item;
        return { ...item, selected: !item.selected };
      })
    );
  };

  const removeItem = (id: string) => {
    setParsedItems(items => items.filter(item => item.id !== id));
  };

  const updateItemObjective = (id: string, objectiveId: string | null) => {
    setParsedItems(items => 
      items.map(item => 
        item.id === id ? { ...item, primaryObjectiveId: objectiveId, strategyId: null } : item
      )
    );
  };

  const updateItemStrategy = (id: string, strategyId: string | null) => {
    setParsedItems(items => 
      items.map(item => 
        item.id === id ? { ...item, strategyId } : item
      )
    );
  };

  const applyObjectiveToSelected = (objectiveId: string | null) => {
    setParsedItems(items => 
      items.map(item => 
        item.selected ? { ...item, primaryObjectiveId: objectiveId, strategyId: null } : item
      )
    );
  };

  const applySuggestionToItem = (id: string) => {
    setParsedItems(items => 
      items.map(item => 
        item.id === id && item.suggestedObjectiveId 
          ? { ...item, primaryObjectiveId: item.suggestedObjectiveId }
          : item
      )
    );
  };

  const applyAllSuggestions = () => {
    setParsedItems(items => 
      items.map(item => 
        item.selected && item.suggestedObjectiveId && !item.primaryObjectiveId
          ? { ...item, primaryObjectiveId: item.suggestedObjectiveId }
          : item
      )
    );
  };

  const selectAll = () => {
    setParsedItems(items => 
      items.map((item, index) => ({ ...item, selected: index < remainingSlots }))
    );
  };

  const deselectAll = () => {
    setParsedItems(items => items.map(item => ({ ...item, selected: false })));
  };

  // Get strategies filtered by objective
  const getStrategiesForObjective = (objectiveId: string | null) => {
    if (!objectiveId) return [];
    return strategies.filter(s => s.primaryObjectiveId === objectiveId);
  };

  // Apply strategy to all tactics in a group
  const applyStrategyToGroup = (objectiveId: string, strategyId: string | null) => {
    setParsedItems(items => 
      items.map(item => 
        item.selected && item.primaryObjectiveId === objectiveId 
          ? { ...item, strategyId } 
          : item
      )
    );
  };

  // Toggle group expansion
  const toggleGroup = (objectiveId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(objectiveId)) {
        next.delete(objectiveId);
      } else {
        next.add(objectiveId);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    const selectedItems = parsedItems
      .filter(item => item.selected)
      .map(item => ({
        text: item.text,
        primaryObjectiveId: item.primaryObjectiveId,
        strategyId: item.strategyId ?? undefined
      }));
    
    if (selectedItems.length > 0) {
      onAdd(selectedItems);
    }
    
    handleClose();
  };

  const handleBack = () => {
    if (step === 'strategies') {
      setStep('objectives');
    } else {
      setStep('input');
    }
  };

  const handleNext = () => {
    if (step === 'objectives' && itemType === 'tactic') {
      // Expand all groups by default when moving to strategy step
      const objectiveIds = [...new Set(parsedItems.filter(i => i.selected && i.primaryObjectiveId).map(i => i.primaryObjectiveId!))];
      setExpandedGroups(new Set(objectiveIds));
      setStep('strategies');
    } else {
      // For strategies, submit directly after objective assignment
      handleSubmit();
    }
  };

  const handleClose = () => {
    setRawText('');
    setParsedItems([]);
    setStep('input');
    setExpandedGroups(new Set());
    setOpen(false);
  };

  const selectedCount = parsedItems.filter(i => i.selected).length;
  const canSelectMore = selectedCount < remainingSlots;
  
  // Validation checks
  const selectedItems = parsedItems.filter(i => i.selected);
  const itemsWithoutObjective = selectedItems.filter(i => !i.primaryObjectiveId);
  const itemsWithSuggestions = selectedItems.filter(i => i.suggestedObjectiveId && !i.primaryObjectiveId);
  const itemsWithoutStrategy = itemType === 'tactic' ? selectedItems.filter(i => !i.strategyId) : [];
  
  // Can proceed from objectives step only if ALL selected items have objectives
  const canProceedFromObjectives = selectedCount > 0 && itemsWithoutObjective.length === 0;
  
  // Group items by objective for strategy step
  const itemsByObjective = useMemo(() => {
    const groups: Record<string, ParsedItemWithObjective[]> = {};
    selectedItems.forEach(item => {
      if (item.primaryObjectiveId) {
        if (!groups[item.primaryObjectiveId]) {
          groups[item.primaryObjectiveId] = [];
        }
        groups[item.primaryObjectiveId].push(item);
      }
    });
    return groups;
  }, [selectedItems]);

  const getObjectiveName = (id: string | null) => {
    if (!id) return null;
    const obj = objectives.find(o => o.id === id);
    return obj ? (getObjectiveDisplayName(obj) || 'Unknown') : 'Unknown';
  };

  const getStrategyName = (id: string | null) => {
    if (!id) return null;
    const str = strategies.find(s => s.id === id);
    return str ? (getStrategyDisplayName(str) || 'Unknown') : 'Unknown';
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <ListPlus className="h-4 w-4 mr-2" />
            Add Multiple
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col min-h-0">
        <DialogHeader>
          <DialogTitle>
            {step === 'input' && `Add Multiple ${itemLabelPlural.charAt(0).toUpperCase() + itemLabelPlural.slice(1)}`}
            {step === 'objectives' && (
              <div className="flex items-center gap-2">
                <span>Step 1: Assign Objectives</span>
                <Badge variant="secondary" className="font-normal">Required</Badge>
              </div>
            )}
            {step === 'strategies' && (
              <div className="flex items-center gap-2">
                <span>Step 2: Assign Strategies</span>
                <Badge variant="outline" className="font-normal">Optional</Badge>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {step === 'input' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Paste your list (one per line)</Label>
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={placeholder}
                className="min-h-[180px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Supports bullet points (-, •, *) and numbered lists. 
                {maxItems && (
                  <span className="text-primary"> You can add up to {remainingSlots} more {itemLabelPlural}.</span>
                )}
              </p>
            </div>
          </div>
        )}

        {step === 'objectives' && (
          <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Helper text */}
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <p className="font-medium text-foreground mb-1">First choose what each {itemLabel} is meant to achieve.</p>
              <p className="text-xs">Every {itemLabel} needs a clear goal before you can proceed.</p>
            </div>

            {/* Summary badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {itemsWithSuggestions.length > 0 && (
                <Badge 
                  variant="secondary" 
                  className="gap-1 cursor-pointer hover:bg-primary/20"
                  onClick={applyAllSuggestions}
                >
                  <Lightbulb className="h-3 w-3 text-primary" />
                  {itemsWithSuggestions.length} suggestions available
                  <span className="text-primary ml-1">— Apply all</span>
                </Badge>
              )}
              {itemsWithoutObjective.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {itemsWithoutObjective.length} need{itemsWithoutObjective.length === 1 ? 's' : ''} objective
                </Badge>
              )}
              {itemsWithoutObjective.length === 0 && selectedCount > 0 && (
                <Badge variant="secondary" className="gap-1 text-success border-success/30">
                  <CheckCircle2 className="h-3 w-3" />
                  All assigned
                </Badge>
              )}
            </div>

            {/* Bulk assign */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ChevronRight className="h-4 w-4" />
                Bulk assign to all selected
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="flex gap-2 items-center">
                  <Label className="text-xs shrink-0 w-24">Objective:</Label>
                  <Select onValueChange={(v) => applyObjectiveToSelected(v === 'none' ? null : v)}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="Apply to all selected..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Clear objective</SelectItem>
                      {objectives.map((obj) => (
                        <SelectItem key={obj.id} value={obj.id}>
                          {getObjectiveDisplayName(obj) || 'Unnamed objective'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Select all header */}
            <div 
              className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors shrink-0"
              onClick={() => selectedCount === parsedItems.length ? deselectAll() : selectAll()}
            >
              <Checkbox
                checked={selectedCount === Math.min(parsedItems.length, remainingSlots)}
                onCheckedChange={(checked) => checked ? selectAll() : deselectAll()}
                className="h-5 w-5"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">Select All</p>
                <p className="text-xs text-muted-foreground">
                  {selectedCount} of {parsedItems.length} selected
                  {maxItems && selectedCount >= remainingSlots && (
                    <span className="text-warning"> (max {remainingSlots} remaining)</span>
                  )}
                </p>
              </div>
            </div>

            <ScrollArea className="flex-1 rounded-md border min-h-0">
              <div className="p-3 space-y-2">
                {parsedItems.map((item) => (
                  <div 
                    key={item.id}
                    className={cn(
                      "p-3 rounded-md border transition-colors",
                      item.selected ? "bg-accent/50 border-border" : "bg-muted/30 opacity-60 border-transparent",
                      !item.selected && !canSelectMore && "cursor-not-allowed",
                      !item.primaryObjectiveId && item.selected && "border-destructive/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={() => toggleItem(item.id)}
                        className="mt-0.5"
                        disabled={!item.selected && !canSelectMore}
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm flex-1">{item.text}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                        
                        {item.selected && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Suggestion badge - clickable to apply */}
                            {item.suggestedObjectiveId && !item.primaryObjectiveId && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs gap-1 cursor-pointer hover:bg-primary/10"
                                    onClick={() => applySuggestionToItem(item.id)}
                                  >
                                    <Lightbulb className="h-3 w-3 text-primary" />
                                    Suggest: {getObjectiveName(item.suggestedObjectiveId)}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Matched: {item.matchedKeywords.join(', ')}</p>
                                  <p className="text-xs text-muted-foreground">Click to apply</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            
                            {/* Status indicator */}
                            {item.primaryObjectiveId && (
                              <Badge variant="outline" className="text-xs gap-1 text-success border-success/30">
                                <CheckCircle2 className="h-3 w-3" />
                                Assigned
                              </Badge>
                            )}
                            {!item.primaryObjectiveId && (
                              <Badge variant="outline" className="text-xs gap-1 text-destructive border-destructive/30">
                                <AlertTriangle className="h-3 w-3" />
                                Needs objective
                              </Badge>
                            )}
                            
                            {/* Objective selector */}
                            <div className="flex items-center gap-1.5">
                              <Target className="h-3 w-3 text-primary shrink-0" />
                              <Select
                                value={item.primaryObjectiveId || 'none'}
                                onValueChange={(v) => updateItemObjective(item.id, v === 'none' ? null : v)}
                              >
                                <SelectTrigger className={cn(
                                  "h-7 text-xs w-auto min-w-[160px]",
                                  !item.primaryObjectiveId && "border-destructive"
                                )}>
                                  <SelectValue placeholder="Select objective..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No objective</SelectItem>
                                  {objectives.map((obj) => (
                                    <SelectItem key={obj.id} value={obj.id}>
                                      {getObjectiveDisplayName(obj) || 'Unnamed objective'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {step === 'strategies' && (
          <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Helper text */}
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <p className="font-medium text-foreground mb-1">Then choose how you plan to achieve each goal.</p>
              <p className="text-xs">Tactics without a strategy will be saved as "Unassigned" in the Repository.</p>
            </div>

            {/* Summary */}
            <div className="flex items-center gap-2 flex-wrap">
              {itemsWithoutStrategy.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <AlertTriangle className="h-3 w-3 text-warning" />
                  {itemsWithoutStrategy.length} unassigned (will go to Repository)
                </Badge>
              )}
              {itemsWithoutStrategy.length === 0 && selectedCount > 0 && (
                <Badge variant="secondary" className="gap-1 text-success border-success/30">
                  <CheckCircle2 className="h-3 w-3" />
                  All have strategies
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 rounded-md border min-h-0">
              <div className="p-3 space-y-4">
                {Object.entries(itemsByObjective).map(([objectiveId, groupItems]) => {
                  const objective = objectives.find(o => o.id === objectiveId);
                  const availableStrategies = getStrategiesForObjective(objectiveId);
                  const isExpanded = expandedGroups.has(objectiveId);
                  const assignedCount = groupItems.filter(i => i.strategyId).length;
                  
                  return (
                    <div key={objectiveId} className="border rounded-lg overflow-hidden">
                      {/* Group header */}
                      <div 
                        className="flex items-center gap-3 p-3 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => toggleGroup(objectiveId)}
                      >
                        <ChevronRight className={cn(
                          "h-4 w-4 transition-transform",
                          isExpanded && "rotate-90"
                        )} />
                        <Target className="h-4 w-4 text-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{objective?.metricName || 'Unknown Objective'}</p>
                          <p className="text-xs text-muted-foreground">
                            {groupItems.length} {groupItems.length === 1 ? itemLabel : itemLabelPlural}
                            {assignedCount > 0 && (
                              <span className="text-success"> • {assignedCount} assigned</span>
                            )}
                          </p>
                        </div>
                        
                        {/* Bulk assign for group */}
                        {availableStrategies.length > 0 && (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Label className="text-xs text-muted-foreground">Assign all:</Label>
                            <Select onValueChange={(v) => applyStrategyToGroup(objectiveId, v === 'none' ? null : v)}>
                              <SelectTrigger className="h-7 text-xs w-[180px]">
                                <SelectValue placeholder="Select strategy..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Clear strategy</SelectItem>
                                {availableStrategies.map((str) => (
                                  <SelectItem key={str.id} value={str.id}>
                                    {getStrategyDisplayName(str) || 'Unnamed strategy'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      
                      {/* Group items */}
                      {isExpanded && (
                        <div className="p-3 space-y-2 border-t">
                          {availableStrategies.length === 0 && (
                            <div className="text-xs text-muted-foreground italic p-2 bg-warning/10 rounded">
                              No strategies linked to this objective. These tactics will be unassigned.
                            </div>
                          )}
                          
                          {groupItems.map((item) => (
                            <div 
                              key={item.id}
                              className={cn(
                                "p-2 rounded-md border transition-colors",
                                item.strategyId ? "bg-success/5 border-success/30" : "bg-warning/5 border-warning/30"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <p className="text-sm">{item.text}</p>
                                </div>
                                
                                {availableStrategies.length > 0 ? (
                                  <Select
                                    value={item.strategyId || 'none'}
                                    onValueChange={(v) => updateItemStrategy(item.id, v === 'none' ? null : v)}
                                  >
                                    <SelectTrigger className={cn(
                                      "h-7 text-xs w-[180px]",
                                      !item.strategyId && "border-warning"
                                    )}>
                                      <SelectValue placeholder="Select strategy..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">Unassigned</SelectItem>
                                      {availableStrategies.map((str) => (
                                        <SelectItem key={str.id} value={str.id}>
                                          {getStrategyDisplayName(str) || 'Unnamed strategy'}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-warning border-warning/30">
                                    No strategies available
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter className="shrink-0">
          {step === 'input' && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleParse} disabled={!rawText.trim()}>
                Parse & Review
              </Button>
            </>
          )}
          
          {step === 'objectives' && (
            <>
              <Button variant="outline" onClick={handleBack}>Back</Button>
              {itemType === 'tactic' ? (
                <Button onClick={handleNext} disabled={!canProceedFromObjectives}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Next: Assign Strategies
                  {!canProceedFromObjectives && (
                    <span className="ml-1 text-xs">({itemsWithoutObjective.length} need objective)</span>
                  )}
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={!canProceedFromObjectives}>
                  <Check className="h-4 w-4 mr-2" />
                  Add {selectedCount} {selectedCount === 1 ? itemLabel : itemLabelPlural}
                </Button>
              )}
            </>
          )}
          
          {step === 'strategies' && (
            <>
              <Button variant="outline" onClick={handleBack}>Back</Button>
              <Button onClick={handleSubmit}>
                <Check className="h-4 w-4 mr-2" />
                Add {selectedCount} {selectedCount === 1 ? itemLabel : itemLabelPlural}
                {itemsWithoutStrategy.length > 0 && (
                  <span className="ml-1 text-xs text-warning">({itemsWithoutStrategy.length} unassigned)</span>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
