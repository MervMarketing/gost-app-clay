import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileCode, Check, AlertTriangle, ChevronRight, Target, Lightbulb, ArrowRight } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Objective, Strategy } from '@/types/gost';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// Color palette matching PyramidVisualization
const objectiveColors = [
  { bg: 'bg-blue-500', light: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
  { bg: 'bg-emerald-500', light: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
  { bg: 'bg-amber-500', light: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
  { bg: 'bg-purple-500', light: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30' },
  { bg: 'bg-rose-500', light: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30' },
];

interface ParsedStrategy {
  id: string;
  name: string;
  primaryObjectiveIndex: number | null; // 1-based index (O1, O2, etc.)
  secondaryObjectiveIndex: number | null;
  tactics: ParsedTactic[];
  hasObjectiveWarning: boolean;
}

interface ParsedTactic {
  id: string;
  text: string;
  inheritedPrimaryObjectiveIndex: number | null;
  inheritedSecondaryObjectiveIndex: number | null;
}

interface StructuredBulkImportProps {
  objectives: Objective[];
  onImport: (strategies: {
    statement: string;
    primaryObjectiveId: string | null;
    secondaryObjectiveIds: string[];
    tactics: { description: string; primaryObjectiveId: string | null; secondaryObjectiveIds: string[] }[];
  }[]) => void;
  trigger?: React.ReactNode;
}

type ImportStep = 'input' | 'preview';

// Parse objective reference like "O1", "O2" etc.
function parseObjectiveRef(text: string): number | null {
  const match = text.match(/O(\d+)/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 5) return num;
  }
  return null;
}

// Parse strategy line: [Strategy] Name | [Primary] O1 | [Secondary] O2
function parseStrategyLine(line: string): { name: string; primaryIndex: number | null; secondaryIndex: number | null } | null {
  const strategyMatch = line.match(/^\[Strategy\]\s*(.+?)(?:\s*\|.*)?$/i);
  if (!strategyMatch) return null;

  let name = strategyMatch[1].trim();
  let primaryIndex: number | null = null;
  let secondaryIndex: number | null = null;

  // Check for objective mappings
  const parts = line.split('|').slice(1);
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.toLowerCase().startsWith('[primary]')) {
      primaryIndex = parseObjectiveRef(trimmed);
      // Also remove from name if it got captured
      name = name.replace(/\s*\|\s*\[Primary\]\s*O\d+/i, '').trim();
    } else if (trimmed.toLowerCase().startsWith('[secondary]')) {
      secondaryIndex = parseObjectiveRef(trimmed);
      name = name.replace(/\s*\|\s*\[Secondary\]\s*O\d+/i, '').trim();
    }
  }

  return { name, primaryIndex, secondaryIndex };
}

// Parse tactic line: - Tactic text
function parseTacticLine(line: string): string | null {
  const match = line.match(/^[-•*]\s*(.+)$/);
  if (match) {
    return match[1].trim();
  }
  return null;
}

export function StructuredBulkImport({ objectives, onImport, trigger }: StructuredBulkImportProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>('input');
  const [rawText, setRawText] = useState('');
  const [parsedStrategies, setParsedStrategies] = useState<ParsedStrategy[]>([]);
  const [expandedStrategies, setExpandedStrategies] = useState<Set<string>>(new Set());

  const placeholder = `Paste your structured outline:

[Strategy] Buyer-first funnel simplification | [Primary] O2 | [Secondary] O3
- Separate Buyer vs Photographer primary CTAs on the website
- Reduce buyer registration fields to order-critical inputs only
- Add progress indicators to checkout flow

[Strategy] Activation before acquisition | [Primary] O1
- Create email drip campaign for new signups
- Build onboarding tutorial series
- Implement welcome sequence

[Strategy] Content-led demand capture
- Launch LinkedIn content series
- Create weekly newsletter
- Build case study library`;

  // Build objective lookup
  const objectiveColorMap = useMemo(() => {
    const map = new Map<number, { objective: Objective; color: typeof objectiveColors[0] }>();
    objectives.forEach((obj, i) => {
      map.set(i + 1, { objective: obj, color: objectiveColors[i % objectiveColors.length] });
    });
    return map;
  }, [objectives]);

  const handleParse = () => {
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    const strategies: ParsedStrategy[] = [];
    let currentStrategy: ParsedStrategy | null = null;
    let tacticIndex = 0;

    for (const line of lines) {
      // Try to parse as strategy
      const strategyData = parseStrategyLine(line);
      if (strategyData) {
        // Save previous strategy if exists
        if (currentStrategy) {
          strategies.push(currentStrategy);
        }
        
        currentStrategy = {
          id: `parsed-str-${Date.now()}-${strategies.length}`,
          name: strategyData.name,
          primaryObjectiveIndex: strategyData.primaryIndex,
          secondaryObjectiveIndex: strategyData.secondaryIndex,
          tactics: [],
          hasObjectiveWarning: !strategyData.primaryIndex
        };
        continue;
      }

      // Try to parse as tactic
      const tacticText = parseTacticLine(line);
      if (tacticText && currentStrategy) {
        currentStrategy.tactics.push({
          id: `parsed-tac-${Date.now()}-${tacticIndex++}`,
          text: tacticText,
          inheritedPrimaryObjectiveIndex: currentStrategy.primaryObjectiveIndex,
          inheritedSecondaryObjectiveIndex: currentStrategy.secondaryObjectiveIndex
        });
      }
    }

    // Add last strategy
    if (currentStrategy) {
      strategies.push(currentStrategy);
    }

    setParsedStrategies(strategies);
    
    // Expand all by default
    setExpandedStrategies(new Set(strategies.map(s => s.id)));
    
    setStep('preview');
  };

  const toggleStrategy = (id: string) => {
    setExpandedStrategies(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleImport = () => {
    const strategiesWithTactics = parsedStrategies.map(ps => {
      const primaryObjId = ps.primaryObjectiveIndex 
        ? objectives[ps.primaryObjectiveIndex - 1]?.id ?? null 
        : null;
      const secondaryObjIds = ps.secondaryObjectiveIndex 
        ? [objectives[ps.secondaryObjectiveIndex - 1]?.id].filter(Boolean) as string[]
        : [];

      return {
        statement: ps.name,
        primaryObjectiveId: primaryObjId,
        secondaryObjectiveIds: secondaryObjIds,
        tactics: ps.tactics.map(t => ({
          description: t.text,
          primaryObjectiveId: t.inheritedPrimaryObjectiveIndex
            ? objectives[t.inheritedPrimaryObjectiveIndex - 1]?.id ?? null
            : null,
          secondaryObjectiveIds: t.inheritedSecondaryObjectiveIndex
            ? [objectives[t.inheritedSecondaryObjectiveIndex - 1]?.id].filter(Boolean) as string[]
            : []
        }))
      };
    });

    onImport(strategiesWithTactics);
    handleClose();
  };

  const handleBack = () => {
    setStep('input');
  };

  const handleClose = () => {
    setRawText('');
    setParsedStrategies([]);
    setStep('input');
    setExpandedStrategies(new Set());
    setOpen(false);
  };

  // Stats
  const totalStrategies = parsedStrategies.length;
  const totalTactics = parsedStrategies.reduce((sum, s) => sum + s.tactics.length, 0);
  const strategiesWithWarning = parsedStrategies.filter(s => s.hasObjectiveWarning).length;

  const getObjectiveLabel = (index: number | null) => {
    if (!index) return null;
    const data = objectiveColorMap.get(index);
    if (!data) return null;
    return {
      label: `O${index}`,
      name: data.objective.metricName || `Objective ${index}`,
      color: data.color
    };
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <FileCode className="h-4 w-4 mr-2" />
            Structured Import
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col min-h-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5 text-primary" />
            {step === 'input' ? 'Structured Bulk Import' : 'Review Import'}
          </DialogTitle>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <p className="font-medium text-foreground mb-2">Import strategies with their tactics in one go.</p>
              <div className="space-y-1 text-xs">
                <p><code className="bg-background px-1 rounded">[Strategy]</code> marks a strategy heading</p>
                <p><code className="bg-background px-1 rounded">| [Primary] O#</code> maps to an objective (1-{objectives.length})</p>
                <p><code className="bg-background px-1 rounded">- Tactic text</code> adds tactics under the strategy</p>
              </div>
            </div>

            {/* Objective reference */}
            {objectives.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="text-muted-foreground">Your objectives:</span>
                {objectives.map((obj, i) => {
                  const color = objectiveColors[i % objectiveColors.length];
                  return (
                    <Badge key={obj.id} variant="outline" className={cn("gap-1", color.border, color.text)}>
                      <div className={cn("w-2 h-2 rounded-full", color.bg)} />
                      O{i + 1}: {obj.metricName || 'Unnamed'}
                    </Badge>
                  );
                })}
              </div>
            )}

            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={placeholder}
              className="flex-1 min-h-[200px] font-mono text-sm resize-none"
            />

            <p className="text-xs text-muted-foreground">
              Tactics will inherit objectives from their parent strategy.
            </p>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Summary */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="gap-1">
                <Lightbulb className="h-3 w-3" />
                {totalStrategies} {totalStrategies === 1 ? 'strategy' : 'strategies'}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                {totalTactics} {totalTactics === 1 ? 'tactic' : 'tactics'}
              </Badge>
              {strategiesWithWarning > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {strategiesWithWarning} need{strategiesWithWarning === 1 ? 's' : ''} objective
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 rounded-md border min-h-0">
              <div className="p-3 space-y-3">
                {parsedStrategies.map((strategy) => {
                  const isExpanded = expandedStrategies.has(strategy.id);
                  const primaryObj = getObjectiveLabel(strategy.primaryObjectiveIndex);
                  const secondaryObj = getObjectiveLabel(strategy.secondaryObjectiveIndex);
                  
                  return (
                    <Collapsible key={strategy.id} open={isExpanded}>
                      <div className={cn(
                        "rounded-lg border overflow-hidden",
                        primaryObj ? primaryObj.color.border : "border-warning/50",
                        primaryObj ? primaryObj.color.light : "bg-warning/10"
                      )}>
                        {/* Strategy header */}
                        <CollapsibleTrigger asChild>
                          <div 
                            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-background/50 transition-colors"
                            onClick={() => toggleStrategy(strategy.id)}
                          >
                            <ChevronRight className={cn(
                              "h-4 w-4 transition-transform shrink-0",
                              isExpanded && "rotate-90"
                            )} />
                            <Lightbulb className={cn(
                              "h-4 w-4 shrink-0",
                              primaryObj ? primaryObj.color.text : "text-warning"
                            )} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{strategy.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {strategy.tactics.length} {strategy.tactics.length === 1 ? 'tactic' : 'tactics'}
                              </p>
                            </div>
                            
                            {/* Objective badges */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {primaryObj ? (
                                <Badge variant="outline" className={cn("text-xs gap-1", primaryObj.color.border, primaryObj.color.text)}>
                                  <Target className="h-3 w-3" />
                                  {primaryObj.label}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs gap-1 text-warning border-warning/30">
                                  <AlertTriangle className="h-3 w-3" />
                                  Needs objective
                                </Badge>
                              )}
                              {secondaryObj && (
                                <Badge variant="outline" className={cn("text-xs", secondaryObj.color.border, secondaryObj.color.text)}>
                                  +{secondaryObj.label}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        
                        {/* Tactics list */}
                        <CollapsibleContent>
                          <div className="border-t px-3 py-2 space-y-1.5 bg-background/50">
                            {strategy.tactics.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic py-1">No tactics</p>
                            ) : (
                              strategy.tactics.map((tactic) => (
                                <div 
                                  key={tactic.id}
                                  className={cn(
                                    "text-sm py-1.5 px-2 rounded border-l-2",
                                    primaryObj ? primaryObj.color.border : "border-warning/50"
                                  )}
                                >
                                  {tactic.text}
                                </div>
                              ))
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}

                {parsedStrategies.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-warning" />
                    <p className="text-sm">No strategies found in the input.</p>
                    <p className="text-xs">Make sure each strategy starts with [Strategy]</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {strategiesWithWarning > 0 && (
              <div className="text-xs text-warning bg-warning/10 p-2 rounded-lg flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Strategies without objectives will be flagged as "Needs Objective" after import.
                  You can assign objectives later.
                </span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="shrink-0">
          {step === 'input' && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleParse} disabled={!rawText.trim()}>
                <ArrowRight className="h-4 w-4 mr-2" />
                Parse & Preview
              </Button>
            </>
          )}
          
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={handleBack}>Back to Edit</Button>
              <Button onClick={handleImport} disabled={parsedStrategies.length === 0}>
                <Check className="h-4 w-4 mr-2" />
                Import {totalStrategies} {totalStrategies === 1 ? 'Strategy' : 'Strategies'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
