import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Rocket, Check, AlertTriangle, ChevronRight, Target, Lightbulb, 
  Zap, Archive, Info, Flag, ChevronDown 
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
import { Badge } from '@/components/ui/badge';
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

// ============= PARSED TYPES =============

interface ParsedGoal {
  title: string;
  about: string | null;
}

interface ParsedObjective {
  id: string;
  title: string;
  about: string | null;
  why: string | null;
  index: number; // 1-based (O1, O2, etc.)
}

interface ParsedTactic {
  id: string;
  title: string;
  about: string | null;
  why: string | null;
  priority: number | null; // Explicit priority (1-based) or null for order-based
  inheritedObjectiveIndex: number | null;
}

interface ParsedStrategy {
  id: string;
  title: string;
  primaryObjectiveIndex: number | null;
  secondaryObjectiveIndex: number | null;
  inheritedObjectiveIndex: number | null; // Auto-inherited from context
  about: string | null;
  why: string | null;
  tactics: ParsedTactic[];
}

interface ParsedPlan {
  goal: ParsedGoal | null;
  objectives: ParsedObjective[];
  strategies: ParsedStrategy[];
  totalTactics: number;
  activeTactics: ParsedTactic[];
  backlogTactics: ParsedTactic[];
}

// ============= EXPORT TYPES =============

export interface FullPlanImportData {
  goal: { text: string; about: string | null } | null;
  objectives: { title: string; about: string | null; why: string | null }[];
  strategies: {
    title: string;
    primaryObjectiveIndex: number | null;
    secondaryObjectiveIndex: number | null;
    about: string | null;
    why: string | null;
    tactics: {
      title: string;
      about: string | null;
      why: string | null;
      isActive: boolean; // Top 10 = true, rest = false
      priority: number;
    }[];
  }[];
}

interface FullPlanImportProps {
  onImport: (data: FullPlanImportData) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type ImportStep = 'input' | 'preview';

// ============= PARSING FUNCTIONS =============

function parseContextField(line: string, fieldName: string): string | null {
  const regex = new RegExp(`^${fieldName}:\\s*(.+)$`, 'i');
  const match = line.match(regex);
  return match ? match[1].trim() : null;
}

function parseObjectiveRef(text: string): number | null {
  const match = text.match(/O(\d+)/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 5) return num;
  }
  return null;
}

function parseFullPlan(rawText: string): ParsedPlan {
  const lines = rawText.split('\n').map(l => l.trim());
  
  const result: ParsedPlan = {
    goal: null,
    objectives: [],
    strategies: [],
    totalTactics: 0,
    activeTactics: [],
    backlogTactics: []
  };

  let currentSection: 'none' | 'goal' | 'objective' | 'strategy' | 'tactic' = 'none';
  let currentObjective: ParsedObjective | null = null;
  let currentStrategy: ParsedStrategy | null = null;
  let currentTactic: ParsedTactic | null = null;
  let objectiveCounter = 0;
  // Track the current objective context from document structure (hierarchy > tags)
  let currentObjectiveContext: number | null = null;
  let tacticCounter = 0;
  const timestamp = Date.now();
  
  // Helper: check if a line is just content (not a marker or field)
  const isContentLine = (line: string): boolean => {
    if (!line) return false;
    // Not a marker
    if (/^\[(GOAL|OBJECTIVE|STRATEGY|Tactic)\]/i.test(line)) return false;
    // Not a known field
    if (/^(Title|About|Why|Primary|Secondary|Priority):/i.test(line)) return false;
    return true;
  };

  for (const line of lines) {
    if (!line) continue;

    // [GOAL] marker - may have inline title: [GOAL] My Goal Text
    const goalMatch = line.match(/^\[GOAL\](?:\s*[:\-]?\s*(.+))?$/i);
    if (goalMatch) {
      currentSection = 'goal';
      result.goal = { title: goalMatch[1]?.trim() || '', about: null };
      continue;
    }

    // [OBJECTIVE] marker - creates a new section boundary, may have inline title
    const objectiveMatch = line.match(/^\[OBJECTIVE\](?:\s*[:\-]?\s*(.+))?$/i);
    if (objectiveMatch) {
      // Save previous strategy before switching contexts
      if (currentStrategy) {
        result.strategies.push(currentStrategy);
        currentStrategy = null;
      }
      // Save previous tactic
      if (currentTactic && currentStrategy) {
        currentStrategy.tactics.push(currentTactic);
        currentTactic = null;
      }
      // Save previous objective
      if (currentObjective) {
        result.objectives.push(currentObjective);
      }
      objectiveCounter++;
      // Update the current objective context - all subsequent strategies/tactics belong here
      currentObjectiveContext = objectiveCounter;
      currentSection = 'objective';
      currentObjective = {
        id: `obj-${timestamp}-${objectiveCounter}`,
        title: objectiveMatch[1]?.trim() || '',
        about: null,
        why: null,
        index: objectiveCounter
      };
      continue;
    }

    // [STRATEGY] marker - inherits from current objective context, may have inline title
    const strategyMatch = line.match(/^\[STRATEGY\](?:\s*[:\-]?\s*(.+))?$/i);
    if (strategyMatch) {
      // Save previous tactic
      if (currentTactic && currentStrategy) {
        currentStrategy.tactics.push(currentTactic);
        currentTactic = null;
      }
      // Save previous strategy
      if (currentStrategy) {
        result.strategies.push(currentStrategy);
      }
      // Save pending objective (if not yet saved)
      if (currentObjective && !result.objectives.find(o => o.id === currentObjective!.id)) {
        result.objectives.push(currentObjective);
        currentObjective = null;
      }
      currentSection = 'strategy';
      currentStrategy = {
        id: `str-${timestamp}-${result.strategies.length}`,
        title: strategyMatch[1]?.trim() || '',
        primaryObjectiveIndex: null, // Explicit tag (optional, lower priority than inherited)
        secondaryObjectiveIndex: null,
        inheritedObjectiveIndex: currentObjectiveContext, // Inherited from document structure
        about: null,
        why: null,
        tactics: []
      };
      continue;
    }

    // [Tactic] marker - inherits from parent strategy, may have inline title
    const tacticMatch = line.match(/^\[Tactic\](?:\s*[:\-]?\s*(.+))?$/i);
    if (tacticMatch) {
      // Save previous tactic
      if (currentTactic && currentStrategy) {
        currentStrategy.tactics.push(currentTactic);
      }
      currentSection = 'tactic';
      tacticCounter++;
      
      // Tactic inherits from its parent strategy's effective objective
      const strategyEffectiveObj = currentStrategy 
        ? (currentStrategy.inheritedObjectiveIndex ?? currentStrategy.primaryObjectiveIndex)
        : null;
        
      currentTactic = {
        id: `tac-${timestamp}-${tacticCounter}`,
        title: tacticMatch[1]?.trim() || '',
        about: null,
        why: null,
        priority: null,
        inheritedObjectiveIndex: strategyEffectiveObj
      };
      continue;
    }

    // Parse field lines based on current section
    // Title: ...
    const titleMatch = parseContextField(line, 'Title');
    if (titleMatch) {
      if (currentSection === 'goal' && result.goal) {
        result.goal.title = titleMatch;
      } else if (currentSection === 'objective' && currentObjective) {
        currentObjective.title = titleMatch;
      } else if (currentSection === 'strategy' && currentStrategy) {
        currentStrategy.title = titleMatch;
      } else if (currentSection === 'tactic' && currentTactic) {
        currentTactic.title = titleMatch;
      }
      continue;
    }

    // About: ...
    const aboutMatch = parseContextField(line, 'About');
    if (aboutMatch) {
      if (currentSection === 'goal' && result.goal) {
        result.goal.about = aboutMatch;
      } else if (currentSection === 'objective' && currentObjective) {
        currentObjective.about = aboutMatch;
      } else if (currentSection === 'strategy' && currentStrategy) {
        currentStrategy.about = aboutMatch;
      } else if (currentSection === 'tactic' && currentTactic) {
        currentTactic.about = aboutMatch;
      }
      continue;
    }

    // Why: ...
    const whyMatch = parseContextField(line, 'Why');
    if (whyMatch) {
      if (currentSection === 'objective' && currentObjective) {
        currentObjective.why = whyMatch;
      } else if (currentSection === 'strategy' && currentStrategy) {
        currentStrategy.why = whyMatch;
      } else if (currentSection === 'tactic' && currentTactic) {
        currentTactic.why = whyMatch;
      }
      continue;
    }

    // Primary: O# (for strategies) - optional tag, does NOT override structure
    // This is kept for backwards compatibility but structure takes precedence
    const primaryMatch = parseContextField(line, 'Primary');
    if (primaryMatch && currentSection === 'strategy' && currentStrategy) {
      // Only set if no inherited context (structure > tags)
      if (currentStrategy.inheritedObjectiveIndex === null) {
        currentStrategy.primaryObjectiveIndex = parseObjectiveRef(primaryMatch);
      }
      // If structure already set inherited, ignore the tag
      continue;
    }

    // Secondary: O# (for strategies)
    const secondaryMatch = parseContextField(line, 'Secondary');
    if (secondaryMatch && currentSection === 'strategy' && currentStrategy) {
      currentStrategy.secondaryObjectiveIndex = parseObjectiveRef(secondaryMatch);
      continue;
    }

    // Priority: # (for tactics)
    const priorityMatch = parseContextField(line, 'Priority');
    if (priorityMatch && currentSection === 'tactic' && currentTactic) {
      const pNum = parseInt(priorityMatch, 10);
      if (!isNaN(pNum) && pNum > 0) {
        currentTactic.priority = pNum;
      }
      continue;
    }
    
    // Fallback: If this is a content line and current item has no title, use it as the title
    // This handles formats where the title is on the line after the marker without "Title:" prefix
    if (isContentLine(line)) {
      if (currentSection === 'goal' && result.goal && !result.goal.title) {
        result.goal.title = line;
        continue;
      } else if (currentSection === 'objective' && currentObjective && !currentObjective.title) {
        currentObjective.title = line;
        continue;
      } else if (currentSection === 'strategy' && currentStrategy && !currentStrategy.title) {
        currentStrategy.title = line;
        continue;
      } else if (currentSection === 'tactic' && currentTactic && !currentTactic.title) {
        currentTactic.title = line;
        continue;
      }
    }
  }

  // Save any remaining items
  if (currentTactic && currentStrategy) {
    currentStrategy.tactics.push(currentTactic);
  }
  if (currentStrategy) {
    result.strategies.push(currentStrategy);
  }
  if (currentObjective && !result.objectives.find(o => o.id === currentObjective!.id)) {
    result.objectives.push(currentObjective);
  }

  // Collect all tactics and split into Active (top 10) vs Backlog
  const allTactics: { tactic: ParsedTactic; strategyIndex: number }[] = [];
  result.strategies.forEach((str, sIdx) => {
    // Effective objective: inherited from structure takes precedence, then explicit tag
    const effectiveObjectiveIndex = str.inheritedObjectiveIndex ?? str.primaryObjectiveIndex;
    
    str.tactics.forEach(tac => {
      // Tactic inherits objective from its parent strategy
      if (!tac.inheritedObjectiveIndex) {
        tac.inheritedObjectiveIndex = effectiveObjectiveIndex;
      }
      allTactics.push({ tactic: tac, strategyIndex: sIdx });
    });
  });

  // Sort by explicit priority (if set), then by order of appearance
  allTactics.sort((a, b) => {
    const pA = a.tactic.priority ?? 9999;
    const pB = b.tactic.priority ?? 9999;
    return pA - pB;
  });

  result.totalTactics = allTactics.length;
  result.activeTactics = allTactics.slice(0, 10).map(t => t.tactic);
  result.backlogTactics = allTactics.slice(10).map(t => t.tactic);

  return result;
}

// ============= COMPONENT =============

export function FullPlanImport({ onImport, trigger, open: controlledOpen, onOpenChange }: FullPlanImportProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use controlled or uncontrolled mode
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (isControlled) {
      onOpenChange?.(value);
    } else {
      setInternalOpen(value);
    }
  };
  
  const [step, setStep] = useState<ImportStep>('input');
  const [rawText, setRawText] = useState('');
  const [parsedPlan, setParsedPlan] = useState<ParsedPlan | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['goal', 'objectives', 'strategies']));

  const placeholder = `Paste your execution plan:

[GOAL]
Title: Maintain growth momentum above $1M ARR
About: The focus for the next 90 days is increasing order velocity and activation reliability.

[OBJECTIVE]
Title: Increase orders per day
About: Grow daily order volume from existing and new customers.
Why: Orders per day is the most direct driver of short-term revenue.

[OBJECTIVE]
Title: Improve activation rate
About: Get more signups to complete their first action.
Why: Activation is the key to retention and revenue.

[STRATEGY]
Title: Buyer-first funnel simplification
Primary: O1
About: Remove confusion and friction in the buyer journey.
Why: Buyers get stuck or drop when the path is unclear.

[Tactic]
Title: Separate Buyer vs Photographer primary CTAs on the website
About: Buyers and photographers currently enter the same flow.
Why: Clear paths increase conversion and speed to order.
Priority: 1

[Tactic]
Title: Reduce buyer registration fields
About: Only ask for order-critical inputs.
Why: Less friction means higher completion.
Priority: 2

[STRATEGY]
Title: Activation optimization
Primary: O2
About: Make the first-time experience smooth.
Why: Users who activate stay longer.

[Tactic]
Title: Add progress indicators to checkout
About: Visual feedback during multi-step flows.
Why: Reduces abandonment by 15%.
Priority: 3`;

  const handleParse = () => {
    const parsed = parseFullPlan(rawText);
    setParsedPlan(parsed);
    setStep('preview');
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleImport = () => {
    if (!parsedPlan) return;

    // Collect all tactics with their active/backlog status
    const activeTacticIds = new Set(parsedPlan.activeTactics.map(t => t.id));
    
    // Build export data
    const exportData: FullPlanImportData = {
      goal: parsedPlan.goal ? {
        text: parsedPlan.goal.title,
        about: parsedPlan.goal.about
      } : null,
      objectives: parsedPlan.objectives.map(obj => ({
        title: obj.title,
        about: obj.about,
        why: obj.why
      })),
      strategies: parsedPlan.strategies.map(str => ({
        title: str.title,
        // Use effective objective: structure (inherited) takes precedence over explicit tags
        primaryObjectiveIndex: str.inheritedObjectiveIndex ?? str.primaryObjectiveIndex,
        secondaryObjectiveIndex: str.secondaryObjectiveIndex,
        about: str.about,
        why: str.why,
        tactics: str.tactics.map((tac, idx) => {
          // Determine priority order
          const priorityOrder = tac.priority ?? (idx + 1);
          return {
            title: tac.title,
            about: tac.about,
            why: tac.why,
            isActive: activeTacticIds.has(tac.id),
            priority: priorityOrder
          };
        })
      }))
    };

    onImport(exportData);
    handleClose();
  };

  const handleBack = () => {
    setStep('input');
  };

  const handleClose = () => {
    setRawText('');
    setParsedPlan(null);
    setStep('input');
    setExpandedSections(new Set(['goal', 'objectives', 'strategies']));
    setOpen(false);
  };

  // Validation
  const hasGoal = parsedPlan?.goal?.title;
  const hasObjectives = (parsedPlan?.objectives.length ?? 0) > 0;
  const hasStrategies = (parsedPlan?.strategies.length ?? 0) > 0;
  const hasTactics = (parsedPlan?.totalTactics ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
      {/* Only render trigger when not in controlled mode */}
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="default" size="sm" className="gap-2">
              <Rocket className="h-4 w-4" />
              Import Plan
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col min-h-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            {step === 'input' ? 'Import Plan' : 'Review Your Plan'}
          </DialogTitle>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
              <p className="font-medium text-foreground mb-2">Paste your execution plan. We'll structure it and put the right work in motion.</p>
              <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                <div>
                  <code className="bg-background px-1 rounded">[GOAL]</code> Your 90-day north star
                </div>
                <div>
                  <code className="bg-background px-1 rounded">[OBJECTIVE]</code> Key metrics
                </div>
                <div>
                  <code className="bg-background px-1 rounded">[STRATEGY]</code> How you'll win
                </div>
                <div>
                  <code className="bg-background px-1 rounded">[Tactic]</code> What you'll do
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs">
                  <strong>Auto-placement:</strong> Top 10 priority tactics → Active Plan. Everything else → Backlog.
                </p>
              </div>
            </div>

            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={placeholder}
              className="flex-1 min-h-[300px] font-mono text-sm resize-none"
            />

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              <span>Use <code className="bg-muted px-1 rounded">Priority: #</code> on tactics to control order. Otherwise, order of appearance is used.</span>
            </div>
          </div>
        )}

        {step === 'preview' && parsedPlan && (
          <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Summary badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {parsedPlan.goal && (
                <Badge variant="secondary" className="gap-1">
                  <Flag className="h-3 w-3" />
                  Goal detected
                </Badge>
              )}
              <Badge variant="secondary" className="gap-1">
                <Target className="h-3 w-3" />
                {parsedPlan.objectives.length} {parsedPlan.objectives.length === 1 ? 'objective' : 'objectives'}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Lightbulb className="h-3 w-3" />
                {parsedPlan.strategies.length} {parsedPlan.strategies.length === 1 ? 'strategy' : 'strategies'}
              </Badge>
              <Badge variant="default" className="gap-1 bg-success text-success-foreground">
                <Zap className="h-3 w-3" />
                {parsedPlan.activeTactics.length} Active
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Archive className="h-3 w-3" />
                {parsedPlan.backlogTactics.length} Backlog
              </Badge>
            </div>

            <div className="flex-1 min-h-0 rounded-md border overflow-y-auto h-[400px]">
              <div className="p-4 space-y-4">
                {/* Goal section */}
                {parsedPlan.goal && (
                  <Collapsible open={expandedSections.has('goal')}>
                    <CollapsibleTrigger asChild>
                      <div 
                        className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/15 transition-colors"
                        onClick={() => toggleSection('goal')}
                      >
                        <ChevronRight className={cn(
                          "h-4 w-4 transition-transform shrink-0",
                          expandedSections.has('goal') && "rotate-90"
                        )} />
                        <Flag className="h-4 w-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">90-Day Goal</p>
                          <p className="text-sm text-muted-foreground truncate">{parsedPlan.goal.title}</p>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-10 mt-2 p-3 bg-muted/30 rounded-lg text-sm">
                        <p className="font-medium">{parsedPlan.goal.title}</p>
                        {parsedPlan.goal.about && (
                          <p className="text-muted-foreground mt-1">{parsedPlan.goal.about}</p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Objectives section */}
                {parsedPlan.objectives.length > 0 && (
                  <Collapsible open={expandedSections.has('objectives')}>
                    <CollapsibleTrigger asChild>
                      <div 
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => toggleSection('objectives')}
                      >
                        <ChevronRight className={cn(
                          "h-4 w-4 transition-transform shrink-0",
                          expandedSections.has('objectives') && "rotate-90"
                        )} />
                        <Target className="h-4 w-4 text-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">Objectives ({parsedPlan.objectives.length})</p>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-10 mt-2 space-y-2">
                        {parsedPlan.objectives.map((obj, i) => {
                          const color = objectiveColors[i % objectiveColors.length];
                          return (
                            <div key={obj.id} className={cn("p-3 rounded-lg border", color.light, color.border)}>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn("text-xs", color.text, color.border)}>
                                  O{obj.index}
                                </Badge>
                                <span className="text-sm font-medium">{obj.title || 'Untitled objective'}</span>
                              </div>
                              {obj.about && (
                                <p className="text-xs text-muted-foreground mt-1">{obj.about}</p>
                              )}
                              {obj.why && (
                                <p className="text-xs text-muted-foreground/70 mt-0.5 italic">Why: {obj.why}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Strategies section */}
                {parsedPlan.strategies.length > 0 && (
                  <Collapsible open={expandedSections.has('strategies')}>
                    <CollapsibleTrigger asChild>
                      <div 
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => toggleSection('strategies')}
                      >
                        <ChevronRight className={cn(
                          "h-4 w-4 transition-transform shrink-0",
                          expandedSections.has('strategies') && "rotate-90"
                        )} />
                        <Lightbulb className="h-4 w-4 text-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">Strategies ({parsedPlan.strategies.length})</p>
                          <p className="text-xs text-muted-foreground">
                            {parsedPlan.totalTactics} total tactics
                          </p>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-10 mt-2 space-y-3">
                        {parsedPlan.strategies.map((str) => {
                          // Structure (inherited) takes precedence over explicit tags
                          const effectiveObjectiveIndex = str.inheritedObjectiveIndex ?? str.primaryObjectiveIndex;
                          const isInherited = str.inheritedObjectiveIndex !== null;
                          const hasObjective = effectiveObjectiveIndex !== null;
                          
                          const objectiveColor = hasObjective 
                            ? objectiveColors[(effectiveObjectiveIndex - 1) % objectiveColors.length]
                            : null;
                          
                          return (
                            <div key={str.id} className={cn(
                              "p-3 rounded-lg border",
                              objectiveColor ? objectiveColor.light : "bg-warning/10",
                              objectiveColor ? objectiveColor.border : "border-warning/30"
                            )}>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Lightbulb className={cn(
                                  "h-4 w-4 shrink-0",
                                  objectiveColor ? objectiveColor.text : "text-warning"
                                )} />
                                <span className="text-sm font-medium flex-1">{str.title || 'Untitled strategy'}</span>
                                {hasObjective ? (
                                  <Badge variant="outline" className={cn("text-xs", objectiveColor?.text, objectiveColor?.border)}>
                                    O{effectiveObjectiveIndex}{isInherited && ' (inherited)'}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-warning border-warning/30">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Needs objective
                                  </Badge>
                                )}
                              </div>
                              {str.about && (
                                <p className="text-xs text-muted-foreground mt-1 ml-6">{str.about}</p>
                              )}
                              {str.tactics.length > 0 && (
                                <div className="mt-2 ml-6 space-y-1">
                                  {str.tactics.map((tac) => {
                                    const isActive = parsedPlan.activeTactics.some(t => t.id === tac.id);
                                    return (
                                      <div 
                                        key={tac.id} 
                                        className={cn(
                                          "text-xs py-1.5 px-2 rounded border-l-2 flex items-center gap-2",
                                          isActive 
                                            ? "bg-success/10 border-success text-success-foreground" 
                                            : "bg-muted/30 border-muted-foreground/30"
                                        )}
                                      >
                                        {isActive ? (
                                          <Zap className="h-3 w-3 shrink-0 text-success" />
                                        ) : (
                                          <Archive className="h-3 w-3 shrink-0 text-muted-foreground" />
                                        )}
                                        <span className="flex-1">{tac.title || 'Untitled tactic'}</span>
                                        {tac.priority && (
                                          <span className="text-muted-foreground">#{tac.priority}</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Empty state */}
                {!hasGoal && !hasObjectives && !hasStrategies && !hasTactics && (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-warning" />
                    <p className="text-sm">No plan elements found.</p>
                    <p className="text-xs">Use [GOAL], [OBJECTIVE], [STRATEGY], and [Tactic] markers.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Placement summary */}
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-success" />
                  <span><strong>{parsedPlan.activeTactics.length}</strong> tactics → Active Plan</span>
                </div>
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                  <span><strong>{parsedPlan.backlogTactics.length}</strong> tactics → Backlog</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="shrink-0">
          {step === 'input' && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleParse} disabled={!rawText.trim()}>
                <ChevronRight className="h-4 w-4 mr-2" />
                Parse & Preview
              </Button>
            </>
          )}
          
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={handleBack}>Back to Edit</Button>
              <Button 
                onClick={handleImport} 
                disabled={!hasGoal && !hasObjectives && !hasStrategies && !hasTactics}
              >
                <Check className="h-4 w-4 mr-2" />
                Import Plan
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
