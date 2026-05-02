import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ReverseFunnelInputs, ReverseFunnelResult } from '@/lib/reverseFunnelMath';
import { DEFAULT_TOOLTIPS } from '@/lib/reverseFunnelMath';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

const fmtInt = (n: number) =>
  Number.isFinite(n) ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(n)) : '—';

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const fmtMonths = (low: number, high: number) => {
  if (!Number.isFinite(low) || !Number.isFinite(high)) return '—';
  const a = Math.min(low, high);
  const b = Math.max(low, high);
  if (Math.abs(a - b) < 0.05) return `${a.toFixed(1)} mo`;
  return `${a.toFixed(1)}–${b.toFixed(1)} mo`;
};

function Tip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Note">
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm text-xs leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

interface ReverseFunnelResultsVisualProps {
  result: ReverseFunnelResult;
  inputs: ReverseFunnelInputs;
  className?: string;
}

/**
 * Editorial / infographic-style results: Clay UI (warm surfaces, display type, muted + success/destructive accents).
 */
export function ReverseFunnelResultsVisual({ result, inputs, className }: ReverseFunnelResultsVisualProps) {
  const cascadeReversed = [...result.cascade].reverse();
  const visitorGap = Math.max(0, result.totalVisitors - result.totalVisitorsSharp);
  const monthly = fmtMoney(inputs.revenuePerMonth);
  const n = inputs.clientCount;

  return (
    <div className={cn('space-y-8', className)}>
      {/* Hero — goal anchor (bottom-up story starts from “the win”) */}
      <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card to-muted/30 px-5 py-8 shadow-sm sm:px-8 sm:py-10">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Reverse funnel
        </p>
        <h2 className="mt-3 font-display text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
          What it actually takes to land{' '}
          <span className="text-destructive">{monthly}</span>
          <span className="text-foreground">/mo</span>
        </h2>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Every conversion rate is a leak. Leaks compound all the way up to how many people have to see you at all.
        </p>

        <div className="mt-8 flex flex-wrap items-end gap-6">
          <div
            className={cn(
              'rounded-xl border-2 border-warning/35 bg-warning-muted/60 px-6 py-5 shadow-sm',
              'dark:border-warning/25 dark:bg-warning-muted/20',
            )}
          >
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">Your goal</p>
            <p className="mt-1 font-display text-4xl font-bold tabular-nums tracking-tight text-foreground sm:text-5xl">
              {n}
            </p>
            <p className="mt-0.5 text-sm font-medium text-muted-foreground">
              client{n === 1 ? '' : 's'} · LTV ≈ {fmtMoney(result.totalLtv)}
            </p>
          </div>
        </div>
      </section>

      {/* Cascade — top of funnel first, goal last (like the poster) */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Working backward
          </h3>
          <Tip text="Each row applies the rate in parentheses to the row below. This is standard funnel math—not a promise about your business." />
        </div>
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          <ul className="divide-y divide-dashed divide-border/80">
            {cascadeReversed.map((row, i) => {
              const isTop = i === 0;
              const isBottom = i === cascadeReversed.length - 1;
              return (
                <li
                  key={row.label}
                  className={cn(
                    'flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:px-5',
                    isTop && 'bg-muted/25',
                    isBottom && 'bg-secondary/40',
                  )}
                >
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'font-medium text-foreground',
                        isTop ? 'font-display text-sm sm:text-base' : 'text-sm',
                      )}
                    >
                      {row.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{row.rateLabel}</p>
                  </div>
                  <p
                    className={cn(
                      'shrink-0 tabular-nums tracking-tight text-foreground',
                      isTop ? 'font-display text-2xl font-semibold sm:text-3xl' : 'font-display text-lg font-semibold sm:text-xl',
                    )}
                  >
                    {fmtInt(row.count)}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Volume comparison — three stat tiles */}
      <section>
        <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Visitor load
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-4 text-center sm:text-left">
            <p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">Top of funnel</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">{fmtInt(result.totalVisitors)}</p>
            <p className="mt-1 text-xs text-muted-foreground">At today’s rates</p>
          </div>
          <div className="rounded-xl border border-success/30 bg-success-muted/50 px-4 py-4 text-center sm:text-left dark:bg-success-muted/15">
            <p className="text-[0.65rem] font-medium uppercase tracking-wide text-success dark:text-success">
              Sharper positioning
            </p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">{fmtInt(result.totalVisitorsSharp)}</p>
            <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground sm:justify-start">
              <Tip text={DEFAULT_TOOLTIPS.compression} />
              ≈{result.compressionFactor.toFixed(1)}× compression
            </p>
          </div>
          <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-4 text-center sm:text-left">
            <p className="text-[0.65rem] font-medium uppercase tracking-wide text-destructive">Illustrative “gap”</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums text-destructive">{fmtInt(visitorGap)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Fewer strangers needed if rates shift (model only)</p>
          </div>
        </div>
      </section>

      {/* Side-by-side story */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 shadow-sm">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-destructive">Today’s story</p>
          <p className="mt-3 font-display text-3xl font-bold tabular-nums text-foreground">{fmtInt(result.totalVisitors)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            People who have to encounter you (rough model) before {n} paying client{n === 1 ? '' : 's'} land at{' '}
            {monthly}/mo.
          </p>
        </div>
        <div className="rounded-2xl border border-success/25 bg-success-muted/40 p-6 shadow-sm dark:bg-success-muted/10">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-success dark:text-success">
            Same client, calmer top
          </p>
          <p className="mt-3 font-display text-3xl font-bold tabular-nums text-foreground">{fmtInt(result.totalVisitorsSharp)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            If visitor-to-lead, bounce, and audience match move like the “sharp” scenario—same goal, less spray at the top.
          </p>
        </div>
      </section>

      {/* Effort strip */}
      <section className="rounded-2xl border border-border/70 bg-secondary/30 px-5 py-5 sm:px-6">
        <p className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Time at your channel mix
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-baseline sm:gap-10">
          <div>
            <p className="text-xs text-success dark:text-success">Sharper positioning</p>
            <p className="font-display text-xl font-semibold tabular-nums">
              {fmtMonths(result.monthsRangeAtChannelsSharp.low, result.monthsRangeAtChannelsSharp.high)}
            </p>
          </div>
          <div className="hidden h-8 w-px bg-border/80 sm:block" aria-hidden />
          <div>
            <p className="text-xs text-muted-foreground">Fuzzier positioning</p>
            <p className="font-display text-xl font-semibold tabular-nums text-muted-foreground">
              {fmtMonths(result.monthsRangeAtChannels.low, result.monthsRangeAtChannels.high)}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Wider spread usually means positioning is the multiplier you have not earned yet.
        </p>
      </section>

      {/* Closing line — poster kicker */}
      <p className="font-display text-center text-base font-semibold leading-snug text-foreground sm:text-lg">
        Positioning is not soft. It is the multiplier that compounds through every stage.
      </p>
    </div>
  );
}
