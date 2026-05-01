import { useState } from 'react';
import { GOSTData } from '@/types/gost';
import { Check, X, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NormalizationPanelProps {
  data: GOSTData;
}

interface RuleCheck {
  label: string;
  passed: boolean;
  message: string;
}

export function NormalizationPanel({ data }: NormalizationPanelProps) {
  const checks: RuleCheck[] = [
    {
      label: 'Execution Goal',
      passed: !!data.executionGoal.text.trim(),
      message: data.executionGoal.text.trim() ? '90-day goal defined' : 'Define your 90-day execution goal'
    },
    {
      label: '3–5 Objectives',
      passed: data.objectives.length >= 1 && data.objectives.length <= 5 && data.objectives.every(o => o.metricName.trim()),
      message: `${data.objectives.length} objective${data.objectives.length !== 1 ? 's' : ''} defined`
    },
    {
      label: '≤8 Strategies',
      passed: data.strategies.length >= 1 && data.strategies.length <= 8 && data.strategies.every(s => s.statement.trim()),
      message: `${data.strategies.length} strateg${data.strategies.length !== 1 ? 'ies' : 'y'} defined`
    },
    {
      label: 'Tactics linked',
      passed: data.tactics.every(t => t.strategyId && data.strategies.some(s => s.id === t.strategyId)),
      message: data.tactics.filter(t => !t.strategyId || !data.strategies.some(s => s.id === t.strategyId)).length === 0
        ? 'All tactics linked'
        : `${data.tactics.filter(t => !t.strategyId || !data.strategies.some(s => s.id === t.strategyId)).length} unlinked`
    },
    {
      label: 'Strategies linked',
      passed: data.strategies.every(s => s.objectiveId && data.objectives.some(o => o.id === s.objectiveId)),
      message: data.strategies.filter(s => !s.objectiveId).length === 0
        ? 'All strategies linked'
        : `${data.strategies.filter(s => !s.objectiveId).length} unsupported`
    }
  ];

  const allPassed = checks.every(c => c.passed);
  const failedCount = checks.filter(c => !c.passed).length;
  
  // Auto-collapse when all passed, expand when issues exist
  const [isExpanded, setIsExpanded] = useState(!allPassed);

  // Compact view when all checks pass
  if (allPassed && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center justify-between p-3 rounded-lg border border-success/20 bg-success-muted/20 hover:bg-success-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-success" />
          <span className="text-sm text-muted-foreground">Normalization Rules</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-success">All checks passed</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="text-sm font-medium text-foreground">Normalization Rules</h3>
        <div className="flex items-center gap-2">
          {allPassed ? (
            <span className="text-xs bg-success-muted text-success px-2 py-1 rounded-full flex items-center gap-1">
              <Check className="w-3 h-3" /> All checks passed
            </span>
          ) : (
            <span className="text-xs bg-warning-muted text-warning px-2 py-1 rounded-full flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {failedCount} issue{failedCount !== 1 ? 's' : ''}
            </span>
          )}
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>
      
      {isExpanded && (
        <>
          <div className="space-y-2">
            {checks.map((check, idx) => (
              <div 
                key={idx}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  check.passed 
                    ? "border-success/30 bg-success-muted/30" 
                    : "border-warning/30 bg-warning-muted/30"
                )}
              >
                <div className="flex items-center gap-2">
                  {check.passed ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <X className="w-4 h-4 text-warning" />
                  )}
                  <span className="text-sm font-medium text-foreground">{check.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{check.message}</span>
              </div>
            ))}
          </div>

          {!allPassed && (
            <p className="text-xs text-muted-foreground italic">
              Fix issues above before finalizing your GOST framework.
            </p>
          )}
        </>
      )}
    </div>
  );
}
