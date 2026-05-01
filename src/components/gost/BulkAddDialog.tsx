import { useState, useMemo } from 'react';
import { 
  RepositoryItemType, 
  GrowthStage, 
  CompanyContext, 
  AbilityToExecute, 
  TimeHorizon,
  RepositoryItem,
  Objective,
  Strategy
} from '@/types/gost';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ListPlus, 
  Check,
  Target,
  Trash2,
  AlertTriangle,
  Wand2,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BulkAddDialogProps {
  objectives: Objective[];
  strategies: Strategy[];
  onAdd: (items: Omit<RepositoryItem, 'id' | 'createdAt'>[]) => void;
}

interface ParsedItem {
  id: string;
  description: string;
  selected: boolean;
  // Per-item overrides
  type: RepositoryItemType;
  outcomeSupported: string | null;
  strategyId: string | null;
  abilityToExecute: AbilityToExecute;
  timeHorizon: TimeHorizon;
  // Auto-detect flags
  suggestedOutcome: string | null;
  isOrphan: boolean;
  keywords: string[];
}

const typeLabels: Record<RepositoryItemType, string> = {
  objective: 'Objective',
  strategy: 'Strategy',
  tactic: 'Tactic'
};

const growthStageLabels: Record<GrowthStage, string> = {
  early: 'Early Stage',
  scaling: 'Scaling',
  optimization: 'Optimization'
};

const companyContextLabels: Record<CompanyContext, string> = {
  solo: 'Solo Operator',
  small_team: 'Small Team',
  team: 'Full Team'
};

const abilityLabels: Record<AbilityToExecute, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High'
};

const timeHorizonLabels: Record<TimeHorizon, string> = {
  short: 'Short (< 2 weeks)',
  medium: 'Medium (2-6 weeks)',
  long: 'Long (6+ weeks)'
};

// Keyword mappings for auto-detection
const CONTENT_KEYWORDS = ['blog', 'linkedin', 'video', 'podcast', 'article', 'content', 'post', 'newsletter', 'tweet', 'thread', 'webinar', 'ebook', 'whitepaper', 'case study'];
const SALES_KEYWORDS = ['sales', 'outreach', 'demo', 'call', 'pitch', 'objection', 'follow-up', 'pipeline'];
const ACTIVATION_KEYWORDS = ['onboard', 'signup', 'activation', 'first order', 'trial', 'welcome', 'tutorial'];

function detectKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  
  CONTENT_KEYWORDS.forEach(kw => {
    if (lower.includes(kw)) found.push(kw);
  });
  SALES_KEYWORDS.forEach(kw => {
    if (lower.includes(kw)) found.push(kw);
  });
  ACTIVATION_KEYWORDS.forEach(kw => {
    if (lower.includes(kw)) found.push(kw);
  });
  
  return found;
}

function suggestOutcome(text: string, objectives: Objective[]): string | null {
  const lower = text.toLowerCase();
  
  // Check for content-related keywords first
  const hasContentKeyword = CONTENT_KEYWORDS.some(kw => lower.includes(kw));
  if (hasContentKeyword) {
    // Find content-related objective
    const contentObj = objectives.find(o => 
      o.metricName.toLowerCase().includes('content') || 
      o.metricName.toLowerCase().includes('demand')
    );
    if (contentObj) return contentObj.id;
  }
  
  // Check for activation keywords
  const hasActivationKeyword = ACTIVATION_KEYWORDS.some(kw => lower.includes(kw));
  if (hasActivationKeyword) {
    const activationObj = objectives.find(o => 
      o.metricName.toLowerCase().includes('activation') ||
      o.metricName.toLowerCase().includes('signup') ||
      o.metricName.toLowerCase().includes('first order') ||
      o.metricName.toLowerCase().includes('conversion')
    );
    if (activationObj) return activationObj.id;
  }
  
  return null;
}

export function BulkAddDialog({ objectives, strategies, onAdd }: BulkAddDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [rawText, setRawText] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [showOrphansOnly, setShowOrphansOnly] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  // Shared defaults for all items
  const [defaultType, setDefaultType] = useState<RepositoryItemType>('tactic');
  const [defaultOutcome, setDefaultOutcome] = useState<string | null>(null);
  const [defaultGrowthStage, setDefaultGrowthStage] = useState<GrowthStage>('scaling');
  const [defaultCompanyContext, setDefaultCompanyContext] = useState<CompanyContext>('small_team');
  const [defaultAbility, setDefaultAbility] = useState<AbilityToExecute>('medium');
  const [defaultTimeHorizon, setDefaultTimeHorizon] = useState<TimeHorizon>('medium');

  const handleParse = () => {
    const lines = rawText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim())
      .filter(line => line.length > 0);
    
    const items: ParsedItem[] = lines.map((line, index) => {
      const keywords = detectKeywords(line);
      const suggestedOutcome = suggestOutcome(line, objectives);
      const outcomeToUse = suggestedOutcome || defaultOutcome;
      
      return {
        id: `bulk-${index}-${Date.now()}`,
        description: line,
        selected: false,
        type: defaultType,
        outcomeSupported: outcomeToUse,
        strategyId: null,
        abilityToExecute: defaultAbility,
        timeHorizon: defaultTimeHorizon,
        suggestedOutcome,
        isOrphan: !outcomeToUse,
        keywords
      };
    });
    
    setParsedItems(items);
    setStep('review');
  };

  const toggleItem = (id: string) => {
    setParsedItems(items => 
      items.map(item => 
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateItem = (id: string, updates: Partial<ParsedItem>) => {
    setParsedItems(items => 
      items.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        // Recalculate orphan status
        updated.isOrphan = !updated.outcomeSupported;
        return updated;
      })
    );
  };

  const removeItem = (id: string) => {
    setParsedItems(items => items.filter(item => item.id !== id));
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const selectAll = () => {
    setParsedItems(items => items.map(item => ({ ...item, selected: true })));
  };

  const deselectAll = () => {
    setParsedItems(items => items.map(item => ({ ...item, selected: false })));
  };

  const selectVisible = () => {
    const visibleIds = new Set(displayedItems.map(i => i.id));
    setParsedItems(items => 
      items.map(item => ({ ...item, selected: visibleIds.has(item.id) ? true : item.selected }))
    );
  };

  const applyToSelected = (updates: Partial<ParsedItem>) => {
    setParsedItems(items => 
      items.map(item => {
        if (!item.selected) return item;
        const updated = { ...item, ...updates };
        updated.isOrphan = !updated.outcomeSupported;
        return updated;
      })
    );
  };

  const handleSubmit = () => {
    const selectedItems = parsedItems
      .filter(item => item.selected)
      .map(item => ({
        type: item.type,
        description: item.description,
        outcomeSupported: item.outcomeSupported,
        growthStage: defaultGrowthStage,
        companyContext: defaultCompanyContext,
        abilityToExecute: item.abilityToExecute,
        timeHorizon: item.timeHorizon,
        status: 'backlog' as const
      }));
    
    if (selectedItems.length > 0) {
      onAdd(selectedItems);
    }
    
    handleClose();
  };

  const handleBack = () => {
    setStep('input');
  };

  const handleClose = () => {
    setRawText('');
    setParsedItems([]);
    setStep('input');
    setShowOrphansOnly(false);
    setExpandedItems(new Set());
    setOpen(false);
  };

  const selectedCount = parsedItems.filter(i => i.selected).length;
  const orphanCount = parsedItems.filter(i => i.isOrphan).length;
  
  const displayedItems = useMemo(() => {
    if (showOrphansOnly) {
      return parsedItems.filter(i => i.isOrphan);
    }
    return parsedItems;
  }, [parsedItems, showOrphansOnly]);

  const getStrategiesForOutcome = (outcomeId: string | null) => {
    if (!outcomeId) return [];
    return strategies.filter(s => s.objectiveId === outcomeId);
  };

  const getOutcomeName = (id: string | null): string => {
    if (!id) return 'None';
    const obj = objectives.find(o => o.id === id);
    return obj?.metricName || 'Unknown';
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon">
              <ListPlus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bulk Add</TooltipContent>
        </Tooltip>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'input' ? 'Bulk Add to Repository' : 'Parse & Review'}
          </DialogTitle>
        </DialogHeader>
        
        {step === 'input' ? (
          <div className="space-y-4 py-4 overflow-y-auto">
            <div className="space-y-2">
              <Label>Paste your list (one item per line)</Label>
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Enter items, one per line:

- Launch referral program
- A/B test pricing page
- Create LinkedIn content series
- Build email nurture sequence
• Create onboarding tutorial`}
                className="min-h-[160px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Supports bullet points (-, •, *) and numbered lists. Auto-detects content/sales/activation keywords.
              </p>
            </div>

            {/* Shared defaults */}
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Default settings (can override per-item)
              </Label>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <Select value={defaultType} onValueChange={(v) => setDefaultType(v as RepositoryItemType)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Target className="h-3 w-3 text-primary" />
                    90-Day Outcome
                  </Label>
                  <Select value={defaultOutcome || 'none'} onValueChange={(v) => setDefaultOutcome(v === 'none' ? null : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (auto-detect)</SelectItem>
                      {objectives.map((obj) => (
                        <SelectItem key={obj.id} value={obj.id}>
                          {obj.metricName || 'Unnamed'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Ability to Execute</Label>
                  <Select value={defaultAbility} onValueChange={(v) => setDefaultAbility(v as AbilityToExecute)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(abilityLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Time Horizon</Label>
                  <Select value={defaultTimeHorizon} onValueChange={(v) => setDefaultTimeHorizon(v as TimeHorizon)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(timeHorizonLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-4 py-4 min-h-0 flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Button
                  variant={showOrphansOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowOrphansOnly(!showOrphansOnly)}
                  className="gap-1.5"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Orphans ({orphanCount})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectVisible()}
                  className="gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  Select Visible
                </Button>
              </div>
              
              {selectedCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{selectedCount} selected:</span>
                  <Select onValueChange={(v) => applyToSelected({ outcomeSupported: v === 'none' ? null : v })}>
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue placeholder="Set Outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {objectives.map((obj) => (
                        <SelectItem key={obj.id} value={obj.id}>
                          {obj.metricName || 'Unnamed'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select onValueChange={(v) => applyToSelected({ type: v as RepositoryItemType })}>
                    <SelectTrigger className="h-8 w-[100px] text-xs">
                      <SelectValue placeholder="Set Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Select all header */}
            <div 
              className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => selectedCount === parsedItems.length ? deselectAll() : selectAll()}
            >
              <Checkbox
                checked={selectedCount === parsedItems.length && parsedItems.length > 0}
                onCheckedChange={(checked) => checked ? selectAll() : deselectAll()}
                className="h-5 w-5"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">Select All</p>
                <p className="text-xs text-muted-foreground">
                  {selectedCount} of {parsedItems.length} selected
                  {orphanCount > 0 && <span className="text-warning"> • {orphanCount} orphans need outcomes</span>}
                </p>
              </div>
            </div>

            <ScrollArea className="flex-1 rounded-md border">
              <div className="p-3 space-y-2">
                {displayedItems.map((item) => {
                  const isExpanded = expandedItems.has(item.id);
                  const itemStrategies = getStrategiesForOutcome(item.outcomeSupported);
                  
                  return (
                    <Collapsible
                      key={item.id}
                      open={isExpanded}
                      onOpenChange={() => toggleExpanded(item.id)}
                    >
                      <div 
                        className={cn(
                          "rounded-md border transition-colors",
                          item.selected ? "bg-accent/50 border-primary/30" : "bg-muted/30 opacity-80",
                          item.isOrphan && "border-warning/50"
                        )}
                      >
                        <div 
                          className="flex items-start gap-3 p-3 cursor-pointer"
                          onClick={() => toggleItem(item.id)}
                        >
                          <Checkbox
                            checked={item.selected}
                            onCheckedChange={() => toggleItem(item.id)}
                            className="mt-0.5"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{item.description}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-[10px] h-5">
                                {typeLabels[item.type]}
                              </Badge>
                              <Badge 
                                variant={item.isOrphan ? "destructive" : "secondary"} 
                                className="text-[10px] h-5 gap-1"
                              >
                                <Target className="h-2.5 w-2.5" />
                                {item.isOrphan ? 'Needs Outcome' : getOutcomeName(item.outcomeSupported)}
                              </Badge>
                              {item.suggestedOutcome && item.suggestedOutcome === item.outcomeSupported && (
                                <Badge variant="outline" className="text-[10px] h-5 gap-1 text-success border-success/30">
                                  <Wand2 className="h-2.5 w-2.5" />
                                  Auto-detected
                                </Badge>
                              )}
                              {item.keywords.length > 0 && (
                                <span className="text-[10px] text-muted-foreground">
                                  Keywords: {item.keywords.slice(0, 2).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            </CollapsibleTrigger>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                        
                        <CollapsibleContent>
                          <div className="px-3 pb-3 pt-1 border-t grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                            <div className="space-y-1">
                              <Label className="text-xs">Type</Label>
                              <Select 
                                value={item.type} 
                                onValueChange={(v) => updateItem(item.id, { type: v as RepositoryItemType })}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(typeLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">90-Day Outcome</Label>
                              <Select 
                                value={item.outcomeSupported || 'none'} 
                                onValueChange={(v) => updateItem(item.id, { outcomeSupported: v === 'none' ? null : v, strategyId: null })}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {objectives.map((obj) => (
                                    <SelectItem key={obj.id} value={obj.id}>
                                      {obj.metricName || 'Unnamed'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {item.type === 'tactic' && item.outcomeSupported && (
                              <div className="space-y-1">
                                <Label className="text-xs">Strategy</Label>
                                <Select 
                                  value={item.strategyId || 'none'} 
                                  onValueChange={(v) => updateItem(item.id, { strategyId: v === 'none' ? null : v })}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Optional" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {itemStrategies.map((str) => (
                                      <SelectItem key={str.id} value={str.id}>
                                        {str.statement || 'Unnamed'}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div className="space-y-1">
                              <Label className="text-xs">Ability</Label>
                              <Select 
                                value={item.abilityToExecute} 
                                onValueChange={(v) => updateItem(item.id, { abilityToExecute: v as AbilityToExecute })}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(abilityLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Time Horizon</Label>
                              <Select 
                                value={item.timeHorizon} 
                                onValueChange={(v) => updateItem(item.id, { timeHorizon: v as TimeHorizon })}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(timeHorizonLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter className="border-t pt-4">
          {step === 'input' ? (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleParse} disabled={!rawText.trim()}>
                Parse & Review
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleBack}>Back</Button>
              <Button onClick={handleSubmit} disabled={selectedCount === 0}>
                <Check className="h-4 w-4 mr-2" />
                Add {selectedCount} {selectedCount === 1 ? 'Item' : 'Items'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
