import { useMemo, useState } from 'react';
import { GOSTData } from '@/types/gost';
import { ClientPriority, PRIORITY_CONFIG } from '@/lib/feedbackService';
import { cn } from '@/lib/utils';
import { MessageSquare, HelpCircle, CheckCircle2, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ClientFeedbackSummaryProps {
  data: GOSTData;
  feedbackMap: Record<string, { priority: ClientPriority; note?: string }>;
  onClearFeedback?: () => Promise<void>;
}

export function ClientFeedbackSummary({ data, feedbackMap, onClearFeedback }: ClientFeedbackSummaryProps) {
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const entries = Object.entries(feedbackMap);
  
  const summary = useMemo(() => {
    const counts: Record<ClientPriority, number> = { high: 0, medium: 0, low: 0, scratch: 0 };
    const clarifications: { tacticId: string; note: string }[] = [];
    const notes: { tacticId: string; priority: ClientPriority; note: string }[] = [];
    
    entries.forEach(([tacticId, fb]) => {
      counts[fb.priority]++;
      if (fb.note?.toLowerCase().includes('clarification')) {
        clarifications.push({ tacticId, note: fb.note });
      } else if (fb.note) {
        notes.push({ tacticId, priority: fb.priority, note: fb.note });
      }
    });
    
    return { counts, clarifications, notes };
  }, [entries]);

  const getTacticName = (tacticId: string) => {
    const tactic = data.tactics.find(t => t.id === tacticId);
    return tactic?.description || 'Unknown tactic';
  };

  const totalTactics = data.tactics.filter(t => t.status !== 'cut').length;
  const ratedCount = entries.length;

  if (ratedCount === 0) {
    return (
      <div className="rounded-lg border border-border p-4 text-center">
        <p className="text-sm text-muted-foreground">No client feedback yet</p>
        <p className="text-xs text-muted-foreground mt-1">Share a link and ask your reviewer to rate tactics</p>
      </div>
    );
  }

  const priorities: ClientPriority[] = ['high', 'medium', 'low', 'scratch'];

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{ratedCount} of {totalTactics} tactics rated</span>
        <span className="text-xs text-muted-foreground">
          {Math.round((ratedCount / totalTactics) * 100)}% complete
        </span>
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${Math.min(100, (ratedCount / totalTactics) * 100)}%` }}
        />
      </div>

      {/* Priority breakdown */}
      <div className="grid grid-cols-4 gap-2">
        {priorities.map(p => {
          const config = PRIORITY_CONFIG[p];
          const count = summary.counts[p];
          return (
            <div key={p} className={cn("rounded-lg p-3 text-center", config.bgColor)}>
              <p className="text-lg font-semibold">{count}</p>
              <p className="text-[11px] font-medium">{config.emoji} {config.label}</p>
            </div>
          );
        })}
      </div>

      {/* Clarification requests */}
      {summary.clarifications.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-amber-500" />
            Clarification requested ({summary.clarifications.length})
          </h4>
          <div className="space-y-1.5">
            {summary.clarifications.map(({ tacticId, note }) => (
              <div key={tacticId} className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3">
                <p className="text-sm font-medium text-foreground">{getTacticName(tacticId)}</p>
                <p className="text-xs text-muted-foreground mt-1">"{note}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {summary.notes.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            Notes ({summary.notes.length})
          </h4>
          <div className="space-y-1.5">
            {summary.notes.map(({ tacticId, priority, note }) => {
              const config = PRIORITY_CONFIG[priority];
              return (
                <div key={tacticId} className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{config.emoji}</span>
                    <p className="text-sm font-medium text-foreground">{getTacticName(tacticId)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">"{note}"</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rated tactics list */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          All ratings
        </h4>
        <div className="space-y-1">
          {entries.map(([tacticId, fb]) => {
            const config = PRIORITY_CONFIG[fb.priority];
            return (
              <div key={tacticId} className="flex items-center gap-2 py-1.5 px-2 rounded text-sm">
                <span className={cn("text-xs px-1.5 py-0.5 rounded-full", config.bgColor)}>
                  {config.emoji}
                </span>
                <span className="text-foreground flex-1 truncate">{getTacticName(tacticId)}</span>
                {fb.note && <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Clear feedback */}
      {onClearFeedback && (
        <div className="pt-2 border-t border-border">
          {!confirmClear ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 className="h-3 w-3 mr-1.5" />
              Clear all feedback
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Delete all ratings?</span>
              <Button
                variant="destructive"
                size="sm"
                className="text-xs h-7"
                disabled={clearing}
                onClick={async () => {
                  setClearing(true);
                  await onClearFeedback();
                  setClearing(false);
                  setConfirmClear(false);
                }}
              >
                {clearing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Yes, clear'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => setConfirmClear(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
