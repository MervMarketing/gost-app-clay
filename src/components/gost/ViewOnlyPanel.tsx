import { useState, useEffect } from 'react';
import { GOSTData, PyramidLayer, TacticStatus } from '@/types/gost';
import { Target, TrendingUp, Lightbulb, CheckSquare, Play, CheckCircle2, Clock, Pause, Ban, ArrowRight, LayoutDashboard, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RepositoryDashboard } from './RepositoryDashboard';
import { ClientFeedbackButtons } from './ClientFeedbackButtons';
import { ClientPriority, FeedbackRecord, getFeedbackForShare } from '@/lib/feedbackService';

interface ViewOnlyPanelProps {
  data: GOSTData;
  activeLayer: PyramidLayer;
  shareId?: string; // If present, enables feedback mode
}

const statusIcons: Record<TacticStatus, typeof Play> = {
  planned: Clock,
  active: Play,
  in_progress: Pause,
  completed: CheckCircle2,
  cut: Ban
};

const statusLabels: Record<TacticStatus, string> = {
  planned: 'Planned',
  active: 'Active',
  in_progress: 'In Progress',
  completed: 'Completed',
  cut: 'Cut'
};

const statusColors: Record<TacticStatus, string> = {
  planned: 'text-muted-foreground bg-secondary',
  active: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  in_progress: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
  completed: 'text-success bg-success-muted',
  cut: 'text-muted-foreground bg-muted'
};

export function ViewOnlyPanel({ data, activeLayer, shareId }: ViewOnlyPanelProps) {
  const [viewTab, setViewTab] = useState<'dashboard' | 'details'>('details');
  const [feedbackMap, setFeedbackMap] = useState<Record<string, { priority: ClientPriority; note?: string }>>({});

  // Load existing feedback on mount
  useEffect(() => {
    if (!shareId) return;
    getFeedbackForShare(shareId).then((records) => {
      const map: Record<string, { priority: ClientPriority; note?: string }> = {};
      records.forEach((r) => {
        map[r.tactic_id] = { priority: r.priority as ClientPriority, note: r.note || undefined };
      });
      setFeedbackMap(map);
    });
  }, [shareId]);

  const handleFeedbackSaved = (tacticId: string, priority: ClientPriority, note?: string) => {
    setFeedbackMap((prev) => ({ ...prev, [tacticId]: { priority, note } }));
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card shadow-subtle">
      {/* Tab navigation */}
      <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as 'dashboard' | 'details')} className="w-full">
        <div className="border-b border-border px-4 pt-4">
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="details" className="gap-2">
              Details
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Dashboard Tab - Progress Overview */}
        <TabsContent value="dashboard" className="p-6 mt-0">
          <RepositoryDashboard data={data} isViewOnly={true} />
        </TabsContent>

        {/* Details Tab - Layer-specific content */}
        <TabsContent value="details" className="p-6 mt-0">
          {/* Goal View */}
          {activeLayer === 'goal' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">90-Day Execution Goal</h2>
                  <p className="text-sm text-muted-foreground">The most important outcome for this planning cycle</p>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-lg font-medium text-foreground">
                  {data.executionGoal.text || 'No execution goal defined'}
                </p>
              </div>
            </div>
          )}

          {/* Objectives View */}
          {activeLayer === 'objectives' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-pyramid-objective/20">
                  <TrendingUp className="h-5 w-5 text-pyramid-objective" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Objectives</h2>
                  <p className="text-sm text-muted-foreground">{data.objectives.length} measurable outcomes</p>
                </div>
              </div>
              <div className="space-y-3">
                {data.objectives.map((obj, i) => (
                  <div key={obj.id} className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded">
                        O{i + 1}
                      </span>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{obj.metricName || 'Unnamed objective'}</h3>
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <span>{obj.baseline || '—'}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="font-medium text-foreground">{obj.target || '—'}</span>
                          <span className="text-xs">({obj.timeframe})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strategies View */}
          {activeLayer === 'strategies' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-pyramid-strategy/20">
                  <Lightbulb className="h-5 w-5 text-pyramid-strategy" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Strategies</h2>
                  <p className="text-sm text-muted-foreground">{data.strategies.length} repeatable approaches</p>
                </div>
              </div>
              <div className="space-y-3">
                {data.strategies.map((str, i) => {
                  const linkedObj = data.objectives.find(o => o.id === str.objectiveId);
                  const tacticCount = data.tactics.filter(t => t.strategyId === str.id).length;
                  return (
                    <div key={str.id} className="p-4 rounded-lg border border-border bg-card">
                      <div className="flex items-start gap-3">
                        <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded">
                          S{i + 1}
                        </span>
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground">{str.statement || 'Unnamed strategy'}</h3>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            {linkedObj && (
                              <span className="flex items-center gap-1">
                                <Target className="h-3 w-3 text-primary" />
                                {linkedObj.metricName}
                              </span>
                            )}
                            <span>{tacticCount} tactics</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tactics View */}
          {activeLayer === 'tactics' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-pyramid-tactic/20">
                  <CheckSquare className="h-5 w-5 text-pyramid-tactic" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Tactics</h2>
                  <p className="text-sm text-muted-foreground">
                    {data.tactics.filter(t => t.status !== 'cut').length} active tactics
                  </p>
                  {shareId && (
                    <p className="text-xs text-primary mt-1">
                      Rate each tactic to share your priorities
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                {data.strategies.map((str) => {
                  const tactics = data.tactics.filter(t => t.strategyId === str.id && t.status !== 'cut');
                  if (tactics.length === 0) return null;
                  
                    return (
                      <Collapsible key={str.id} defaultOpen className="space-y-2">
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-pyramid-strategy/10 border border-pyramid-strategy/20 hover:bg-pyramid-strategy/15 transition-colors cursor-pointer group">
                            <Lightbulb className="h-3.5 w-3.5 text-pyramid-strategy" />
                            <span className="text-xs font-semibold text-pyramid-strategy uppercase tracking-wide">Strategy</span>
                            <span className="text-sm font-medium text-foreground flex-1 text-left">{str.statement || 'Unnamed strategy'}</span>
                            <span className="text-xs text-muted-foreground">{tactics.length}</span>
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-2 ml-5">
                            {tactics.map((tac) => {
                              const StatusIcon = statusIcons[tac.status];
                              const feedback = feedbackMap[tac.id];
                              return (
                                <div key={tac.id} className="p-3 rounded-lg border border-border bg-card space-y-2">
                                  <div className="flex items-start gap-3">
                                    <div className={cn(
                                      "flex items-center gap-1.5 text-xs px-2 py-1 rounded-full shrink-0",
                                      statusColors[tac.status]
                                    )}>
                                      <StatusIcon className="h-3 w-3" />
                                      {statusLabels[tac.status]}
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm text-foreground">{tac.description || 'Unnamed tactic'}</p>
                                      {tac.startedAt && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Started {formatDistanceToNow(new Date(tac.startedAt), { addSuffix: true })}
                                          {tac.completedAt && (
                                            <> · Completed {format(new Date(tac.completedAt), 'MMM d')}</>
                                          )}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {/* Feedback buttons */}
                                  {shareId && (
                                    <div className="ml-0 sm:ml-8 pt-1 border-t border-border/50">
                                      <ClientFeedbackButtons
                                        shareId={shareId}
                                        tacticId={tac.id}
                                        currentPriority={feedback?.priority}
                                        currentNote={feedback?.note}
                                        onFeedbackSaved={handleFeedbackSaved}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
