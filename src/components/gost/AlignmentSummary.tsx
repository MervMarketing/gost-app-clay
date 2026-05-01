import { AlertTriangle } from 'lucide-react';

interface AlignmentSummaryProps {
  issues: { type: 'tactic' | 'strategy' | 'objective'; id: string; message: string }[];
}

export function AlignmentSummary({ issues }: AlignmentSummaryProps) {
  if (issues.length === 0) return null;

  const tacticIssues = issues.filter(i => i.type === 'tactic' && i.message.includes('not linked')).length;
  const strategyIssues = issues.filter(i => i.type === 'strategy' && i.message.includes('not support')).length;
  const otherIssues = issues.length - tacticIssues - strategyIssues;

  const parts: string[] = [];
  if (tacticIssues > 0) parts.push(`${tacticIssues} tactic${tacticIssues > 1 ? 's' : ''} unlinked`);
  if (strategyIssues > 0) parts.push(`${strategyIssues} strateg${strategyIssues > 1 ? 'ies' : 'y'} unsupported`);
  if (otherIssues > 0) parts.push(`${otherIssues} other issue${otherIssues > 1 ? 's' : ''}`);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-warning/25 bg-warning-muted px-3 py-2.5 shadow-subtle">
      <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
      <span className="text-sm text-warning-foreground">
        <span className="font-medium">Alignment Check:</span>{' '}
        {parts.join(' • ')}
      </span>
    </div>
  );
}
