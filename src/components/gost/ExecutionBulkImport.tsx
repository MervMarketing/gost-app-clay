import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Rocket, Check, AlertTriangle, ChevronRight, Target, Lightbulb, Zap, Archive, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Objective, TacticStatus } from '@/types/gost';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Color palette matching PyramidVisualization
const objectiveColors = [
  { bg: 'bg-blue-500', light: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
  { bg: 'bg-emerald-500', light: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
  { bg: 'bg-amber-500', light: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
  { bg: 'bg-purple-500', light: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30' },
  { bg: 'bg-rose-500', light: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30' },
];

export type PriorityBucketImport = 'Quick Win' | 'Phase 2';
export type StatusImport = 'Active' | 'Backlog';

interface ParsedTacticExecution {
  id: string;
  text: string;
  priority: PriorityBucketImport | null;
  status: StatusImport;
  about: string | null;
  why: string | null;
  inheritedPrimaryObjectiveIndex: number | null;
}

interface ParsedStrategyExecution {
  id: string;
  name: string;
  primaryObjectiveIndex: number | null;
  tactics: ParsedTacticExecution[];
  hasObjectiveWarning: boolean;
}

export interface ExecutionImportData {
  statement: string;
  primaryObjectiveId: string | null;
  tactics: {
    description: string;
    primaryObjectiveId: string | null;
    status: TacticStatus;
    priority: PriorityBucketImport | null;
    about: string | null;
    why: string | null;
    isBacklog: boolean;
  }[];
}

interface ExecutionBulkImportProps {
  objectives: Objective[];
  onImport: (strategies: ExecutionImportData[]) => void;
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

// Parse priority: Quick Win or Phase 2
function parsePriority(text: string): PriorityBucketImport | null {
  const lower = text.toLowerCase();
  if (lower.includes('quick win')) return 'Quick Win';
  if (lower.includes('phase 2') || lower.includes('phase2')) return 'Phase 2';
  return null;
}

// Parse status: Active or Backlog
function parseStatus(text: string): StatusImport {
  const lower = text.toLowerCase();
  if (lower.includes('active')) return 'Active';
  return 'Backlog'; // Default to Backlog
}

// Parse strategy line: [Strategy] Name | [Primary] O1
function parseStrategyLine(line: string): { name: string; primaryIndex: number | null } | null {
  const strategyMatch = line.match(/^\[Strategy\]\s*(.+?)(?:\s*\|.*)?$/i);
  if (!strategyMatch) return null;

  let name = strategyMatch[1].trim();
  let primaryIndex: number | null = null;

  // Check for objective mappings
  const parts = line.split('|').slice(1);
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.toLowerCase().startsWith('[primary]')) {
      primaryIndex = parseObjectiveRef(trimmed);
      // Also remove from name if it got captured
      name = name.replace(/\s*\|\s*\[Primary\]\s*O\d+/i, '').trim();
    }
  }

  return { name, primaryIndex };
}

// Parse tactic line: - <tactic title> | [Priority] <Quick Win|Phase 2> | [Status] <Active|Backlog>
function parseTacticLine(line: string): { text: string; priority: PriorityBucketImport | null; status: StatusImport } | null {
  const match = line.match(/^[-•*]\s*(.+)$/);
  if (!match) return null;

  const fullText = match[1];
  const parts = fullText.split('|').map(p => p.trim());
  
  let text = parts[0];
  let priority: PriorityBucketImport | null = null;
  let status: StatusImport = 'Backlog';

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const lower = part.toLowerCase();
    
    if (lower.startsWith('[priority]')) {
      priority = parsePriority(part);
    } else if (lower.startsWith('[status]')) {
      status = parseStatus(part);
    }
  }

  return { text, priority, status };
}

// Parse context line: [About] or [Why]
function parseContextLine(line: string): { type: 'about' | 'why'; value: string } | null {
  const aboutMatch = line.match(/^\[About\]\s*(.+)$/i);
  if (aboutMatch) {
    return { type: 'about', value: aboutMatch[1].trim() };
  }
  
  const whyMatch = line.match(/^\[Why\]\s*(.+)$/i);
  if (whyMatch) {
    return { type: 'why', value: whyMatch[1].trim() };
  }
  
  return null;
}

export function ExecutionBulkImport({ objectives, onImport, trigger }: ExecutionBulkImportProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>('input');
  const [rawText, setRawText] = useState('');
  const [parsedStrategies, setParsedStrategies] = useState<ParsedStrategyExecution[]>([]);
  const [expandedStrategies, setExpandedStrategies] = useState<Set<string>>(new Set());

  const placeholder = `Paste your execution plan:

[Strategy] Activation optimization | [Primary] O1
- Simplify registration flow | [Priority] Quick Win | [Status] Active
[About] Reduce signup friction for new users
[Why] 60% drop-off at registration step
- Add progress indicators | [Priority] Phase 2 | [Status] Backlog
[About] Visual feedback during checkout
[Why] Improves completion rates by 15%

[Strategy] Retention improvements | [Primary] O2
- Email drip campaign | [Priority] Quick Win | [Status] Active
[About] 7-day onboarding sequence
[Why] Increases day-7 retention by 20%
- Build loyalty program | [Priority] Phase 2 | [Status] Backlog
[About] Points-based rewards system
[Why] Drives repeat purchases`;

  // Build objective lookup
  const objectiveColorMap = useMemo(() => {
    const map = new Map<number, { objective: Objective; color: typeof objectiveColors[0] }>();
    objectives.forEach((obj, i) => {
      map.set(i + 1, { objective: obj, color: objectiveColors[i % objectiveColors.length] });
    });
    return map;
  }, [objectives]);

  const handleParse = () => {
    const lines = rawText.split('\n').map(l => l.trim());
    
    const strategies: ParsedStrategyExecution[] = [];
    let currentStrategy: ParsedStrategyExecution | null = null;
    let currentTactic: ParsedTacticExecution | null = null;
    let tacticIndex = 0;

    for (const line of lines) {
      if (!line) continue;
      
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
          tactics: [],
          hasObjectiveWarning: !strategyData.primaryIndex
        };
        currentTactic = null;
        continue;
      }

      // Try to parse as tactic
      const tacticData = parseTacticLine(line);
      if (tacticData && currentStrategy) {
        currentTactic = {
          id: `parsed-tac-${Date.now()}-${tacticIndex++}`,
          text: tacticData.text,
          priority: tacticData.priority,
          status: tacticData.status,
          about: null,
          why: null,
          inheritedPrimaryObjectiveIndex: currentStrategy.primaryObjectiveIndex
        };
        currentStrategy.tactics.push(currentTactic);
        continue;
      }

      // Try to parse as context line (About/Why)
      const contextData = parseContextLine(line);
      if (contextData && currentTactic) {
        if (contextData.type === 'about') {
          currentTactic.about = contextData.value;
        } else if (contextData.type === 'why') {
          currentTactic.why = contextData.value;
        }
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
    const strategiesWithTactics: ExecutionImportData[] = parsedStrategies.map(ps => {
      const primaryObjId = ps.primaryObjectiveIndex 
        ? objectives[ps.primaryObjectiveIndex - 1]?.id ?? null 
        : null;

      return {
        statement: ps.name,
        primaryObjectiveId: primaryObjId,
        tactics: ps.tactics.map(t => ({
          description: t.text,
          primaryObjectiveId: t.inheritedPrimaryObjectiveIndex
            ? objectives[t.inheritedPrimaryObjectiveIndex - 1]?.id ?? null
            : null,
          status: t.status === 'Active' ? 'active' as TacticStatus : 'planned' as TacticStatus,
          priority: t.priority,
          about: t.about,
          why: t.why,
          isBacklog: t.status === 'Backlog'
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
  const activeTactics = parsedStrategies.reduce((sum, s) => sum + s.tactics.filter(t => t.status === 'Active').length, 0);
  const backlogTactics = totalTactics - activeTactics;
  const quickWins = parsedStrategies.reduce((sum, s) => sum + s.tactics.filter(t => t.priority === 'Quick Win').length, 0);
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
            <Rocket className="h-4 w-4 mr-2" />
            Execution Import
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col min-h-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            {step === 'input' ? 'Bulk Import (Execution Plan)' : 'Review Import'}
          </DialogTitle>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <p className="font-medium text-foreground mb-2">Import strategies + tactics with priority, status, and context.</p>
              <div className="space-y-1 text-xs">
                <p><code className="bg-background px-1 rounded">[Strategy] Name | [Primary] O#</code> creates a strategy</p>
                <p><code className="bg-background px-1 rounded">- Tactic | [Priority] Quick Win | [Status] Active</code> creates a tactic</p>
                <p><code className="bg-background px-1 rounded">[About] Description</code> adds context</p>
                <p><code className="bg-background px-1 rounded">[Why] Reason</code> adds rationale</p>
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

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              <span><strong>Active</strong> = Active Plan, <strong>Backlog</strong> = Repository. Priority buckets are preserved.</span>
            </div>
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
              <Badge variant="default" className="gap-1 bg-success text-success-foreground">
                <Zap className="h-3 w-3" />
                {activeTactics} Active
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Archive className="h-3 w-3" />
                {backlogTactics} Backlog
              </Badge>
              {quickWins > 0 && (
                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                  🚀 {quickWins} Quick Wins
                </Badge>
              )}
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
                                {strategy.tactics.filter(t => t.status === 'Active').length > 0 && (
                                  <span className="text-success ml-1">
                                    ({strategy.tactics.filter(t => t.status === 'Active').length} active)
                                  </span>
                                )}
                              </p>
                            </div>
                            
                            {/* Objective badge */}
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
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        
                        {/* Tactics list */}
                        <CollapsibleContent>
                          <div className="border-t px-3 py-2 space-y-2 bg-background/50">
                            {strategy.tactics.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic py-1">No tactics</p>
                            ) : (
                              strategy.tactics.map((tactic) => (
                                <div 
                                  key={tactic.id}
                                  className={cn(
                                    "text-sm py-2 px-3 rounded border-l-2 bg-card",
                                    tactic.status === 'Active' ? "border-success" : "border-muted-foreground/30"
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="flex-1">{tactic.text}</span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {tactic.priority && (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger>
                                              <Badge 
                                                variant="outline" 
                                                className={cn(
                                                  "text-[10px] px-1.5",
                                                  tactic.priority === 'Quick Win' 
                                                    ? "text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950" 
                                                    : "text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950"
                                                )}
                                              >
                                                {tactic.priority === 'Quick Win' ? '🚀' : '⚙️'}
                                              </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>{tactic.priority}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                      <Badge 
                                        variant={tactic.status === 'Active' ? 'default' : 'outline'}
                                        className={cn(
                                          "text-[10px] px-1.5",
                                          tactic.status === 'Active' && "bg-success text-success-foreground"
                                        )}
                                      >
                                        {tactic.status}
                                      </Badge>
                                    </div>
                                  </div>
                                  
                                  {/* Context notes */}
                                  {(tactic.about || tactic.why) && (
                                    <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                                      {tactic.about && (
                                        <p><span className="font-medium">About:</span> {tactic.about}</p>
                                      )}
                                      {tactic.why && (
                                        <p><span className="font-medium">Why:</span> {tactic.why}</p>
                                      )}
                                    </div>
                                  )}
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
                </span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 'input' ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleParse} 
                disabled={!rawText.trim()}
              >
                Parse & Preview
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleBack}>
                Back to Edit
              </Button>
              <Button 
                onClick={handleImport}
                disabled={parsedStrategies.length === 0}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                Import {totalStrategies} {totalStrategies === 1 ? 'strategy' : 'strategies'}, {totalTactics} {totalTactics === 1 ? 'tactic' : 'tactics'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
