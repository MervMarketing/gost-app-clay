import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { ExecutionGoal, Objective } from '@/types/gost';
import {
  CHANNEL_DEFS,
  type ChannelId,
  type ReverseFunnelInputs,
  REVERSE_FUNNEL_STORAGE_KEY,
  buildInitialGOSTDataFromReverseFunnel,
  buildObjectiveListFromInputs,
  computeReverseFunnel,
  defaultReverseFunnelInputs,
  goalTextFromInputs,
  rebalanceChannelPcts,
  DEFAULT_TOOLTIPS,
} from '@/lib/reverseFunnelMath';
import { ReverseFunnelResultsVisual } from '@/components/tools/ReverseFunnelResultsVisual';
import { ArrowRight, Info, Sparkles } from 'lucide-react';

function Tip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex text-muted-foreground hover:text-foreground"
          aria-label="Source note"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm text-xs leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

export interface ReverseFunnelToolProps {
  /** When true, tighter copy and “Apply to this plan” instead of only project creation. */
  embedded?: boolean;
  onApplyToPlan?: (goal: ExecutionGoal, objectives: Objective[]) => void;
  /** After apply, e.g. switch tab */
  onApplied?: () => void;
  /** If true, prompt before overwriting goal/objectives */
  confirmBeforeApply?: boolean;
  onBuildNewProject?: (initialData: ReturnType<typeof buildInitialGOSTDataFromReverseFunnel>) => Promise<void>;
  buildBusy?: boolean;
  className?: string;
}

export function ReverseFunnelTool({
  embedded = false,
  onApplyToPlan,
  onApplied,
  confirmBeforeApply = false,
  onBuildNewProject,
  buildBusy = false,
  className,
}: ReverseFunnelToolProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [inputs, setInputs] = useState<ReverseFunnelInputs>(() => defaultReverseFunnelInputs());
  const [debounced, setDebounced] = useState(inputs);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(inputs), 300);
    return () => window.clearTimeout(t);
  }, [inputs]);

  useEffect(() => {
    if (embedded) return;
    try {
      const raw = sessionStorage.getItem(REVERSE_FUNNEL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ReverseFunnelInputs>;
        setInputs((prev) => ({
          ...prev,
          ...parsed,
          channelPcts: parsed.channelPcts
            ? { ...prev.channelPcts, ...parsed.channelPcts }
            : prev.channelPcts,
        }));
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [embedded]);

  useEffect(() => {
    if (embedded || !hydrated) return;
    try {
      sessionStorage.setItem(REVERSE_FUNNEL_STORAGE_KEY, JSON.stringify(inputs));
    } catch {
      /* ignore */
    }
  }, [inputs, embedded, hydrated]);

  const result = useMemo(() => computeReverseFunnel(debounced), [debounced]);
  const latestOk = useMemo(() => computeReverseFunnel(inputs) !== null, [inputs]);

  const updateChannel = useCallback((id: ChannelId, pct: number) => {
    setInputs((prev) => ({
      ...prev,
      channelPcts: rebalanceChannelPcts(prev.channelPcts, id, pct),
    }));
  }, []);

  const runApply = useCallback(() => {
    if (!onApplyToPlan) return;
    const latest = computeReverseFunnel(inputs);
    if (!latest) return;
    const goal: ExecutionGoal = { text: goalTextFromInputs(inputs, latest.totalLtv) };
    const objectives = buildObjectiveListFromInputs(inputs);
    onApplyToPlan(goal, objectives);
    onApplied?.();
  }, [inputs, onApplyToPlan, onApplied]);

  const handleApplyClick = () => {
    if (!latestOk) return;
    if (confirmBeforeApply) setConfirmOpen(true);
    else runApply();
  };

  const handleBuildProject = async () => {
    if (!onBuildNewProject) return;
    const latest = computeReverseFunnel(inputs);
    if (!latest) return;
    if (!isAuthenticated) {
      try {
        sessionStorage.setItem(REVERSE_FUNNEL_STORAGE_KEY, JSON.stringify(inputs));
      } catch {
        /* ignore */
      }
      navigate(`/auth?next=${encodeURIComponent('/tools/reverse-funnel')}`);
      return;
    }
    const initial = buildInitialGOSTDataFromReverseFunnel(inputs, latest);
    await onBuildNewProject(initial);
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div
        className={cn(
          'grid gap-6 lg:grid-cols-[minmax(0,38%)_1fr]',
          embedded && 'lg:grid-cols-[minmax(0,42%)_1fr]',
        )}
      >
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">Your inputs</CardTitle>
            <CardDescription>
              {embedded
                ? 'Works even when you are not using a homepage check—revenue and funnel math stand on their own.'
                : 'Adjust numbers; results update automatically.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 1 · Goal</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rf-rev">$/month per client</Label>
                  <Input
                    id="rf-rev"
                    type="number"
                    min={100}
                    max={100000}
                    value={inputs.revenuePerMonth}
                    onChange={(e) =>
                      setInputs((p) => ({ ...p, revenuePerMonth: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rf-life">Lifetime (months)</Label>
                  <Input
                    id="rf-life"
                    type="number"
                    min={1}
                    max={60}
                    value={inputs.lifetimeMonths}
                    onChange={(e) =>
                      setInputs((p) => ({ ...p, lifetimeMonths: Number(e.target.value) || 1 }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rf-clients">Clients to land</Label>
                  <Input
                    id="rf-clients"
                    type="number"
                    min={1}
                    max={100}
                    value={inputs.clientCount}
                    onChange={(e) =>
                      setInputs((p) => ({ ...p, clientCount: Number(e.target.value) || 1 }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 2 · Sales</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="rf-close">Close rate (qualified opps)</Label>
                    <Tip text={DEFAULT_TOOLTIPS.closeRate} />
                  </div>
                  <Input
                    id="rf-close"
                    type="number"
                    min={1}
                    max={99}
                    value={inputs.closeRatePct}
                    onChange={(e) =>
                      setInputs((p) => ({ ...p, closeRatePct: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="rf-qual">Lead → qualified %</Label>
                    <Tip text={DEFAULT_TOOLTIPS.leadToQual} />
                  </div>
                  <Input
                    id="rf-qual"
                    type="number"
                    min={1}
                    max={99}
                    value={inputs.leadToQualPct}
                    onChange={(e) =>
                      setInputs((p) => ({ ...p, leadToQualPct: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 3 · Site / funnel</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="rf-v2l">Visitor → lead %</Label>
                    <Tip text={DEFAULT_TOOLTIPS.visitorToLead} />
                  </div>
                  <Input
                    id="rf-v2l"
                    type="number"
                    min={0.1}
                    step={0.1}
                    max={20}
                    value={inputs.visitorToLeadPct}
                    onChange={(e) =>
                      setInputs((p) => ({ ...p, visitorToLeadPct: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="rf-bounce">Bounce rate %</Label>
                    <Tip text={DEFAULT_TOOLTIPS.bounce} />
                  </div>
                  <Input
                    id="rf-bounce"
                    type="number"
                    min={1}
                    max={95}
                    value={inputs.bouncePct}
                    onChange={(e) =>
                      setInputs((p) => ({ ...p, bouncePct: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="rf-aud">Audience match %</Label>
                    <Tip text={DEFAULT_TOOLTIPS.audience} />
                  </div>
                  <Input
                    id="rf-aud"
                    type="number"
                    min={5}
                    max={95}
                    value={inputs.audienceEfficiencyPct}
                    onChange={(e) =>
                      setInputs((p) => ({ ...p, audienceEfficiencyPct: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Step 4 · Channel mix (≈100%)
              </p>
              <p className="text-xs text-muted-foreground">
                Sliders rebalance the others. Ceilings are rough organic-style caps for the effort model—not spend forecasts.
              </p>
              <div className="space-y-4">
                {CHANNEL_DEFS.map((ch) => (
                  <div key={ch.id} className="space-y-2">
                    <div className="flex justify-between gap-2 text-xs">
                      <span className="font-medium text-foreground">{ch.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {inputs.channelPcts[ch.id].toFixed(1)}%
                      </span>
                    </div>
                    <Slider
                      value={[inputs.channelPcts[ch.id]]}
                      min={0}
                      max={100}
                      step={0.5}
                      onValueChange={([v]) => updateChannel(ch.id, v)}
                    />
                    <p className="text-[0.65rem] leading-snug text-muted-foreground">{ch.ceilingNote}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border/80 bg-background/50 p-4 sm:p-6">
            <div className="mb-6 flex flex-col gap-1 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">The picture</h2>
                <p className="text-sm text-muted-foreground">Model, not a forecast—same spirit as the $3K scenario poster.</p>
              </div>
            </div>
            {!result ? (
              <p className="text-sm text-muted-foreground">Check inputs—rates must be positive.</p>
            ) : (
              <ReverseFunnelResultsVisual result={result} inputs={debounced} />
            )}
          </div>

          <Card className="border-primary/25 bg-primary/5">
            <CardContent className="pt-6">
              <p className="font-display text-base font-semibold">The math is supposed to feel hard.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use it to agree on what to change first—then put that into your plan.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {embedded && onApplyToPlan ? (
                  <Button type="button" onClick={handleApplyClick} disabled={!latestOk} className="gap-2">
                    Apply to this plan
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : null}
                {!embedded && onBuildNewProject ? (
                  <Button
                    type="button"
                    onClick={() => void handleBuildProject()}
                    disabled={!latestOk || buildBusy}
                    className="gap-2"
                  >
                    {buildBusy ? 'Creating…' : 'Build a starter GOST plan'}
                    <Sparkles className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
              {!embedded ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Creating a project requires a free account. Your inputs stay in this browser until you clear site data.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace goal and objectives?</AlertDialogTitle>
            <AlertDialogDescription>
              This overwrites your execution goal and all objectives. Strategies and tactics stay, but objective links are
              cleared until you reconnect them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                runApply();
              }}
            >
              Replace and apply
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
