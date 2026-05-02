import { useEffect, useMemo, useState } from 'react';
import type { CLGAuditResult, CLGRecommendation } from '@/types/gost';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { publicBandLabel } from '@/lib/clgAudit';
import {
  RUBRIC_DIMENSION_UI,
  buildCriteriaRailItems,
  dimensionFromIssue,
  homepagePreviewImageUrl,
  partitionRecommendationsForRail,
  stickySlot,
  truncateNote,
  type RubricDimension,
} from '@/lib/clgAuditVisual';
import { ExternalLink, ImageOff } from 'lucide-react';

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero',
  differentiation: 'Differentiation',
  demo: 'Demo / proof',
  trust: 'Trust',
  doors: 'Offer paths',
  resources: 'Resources',
  closingCta: 'Closing CTA',
};

interface CLGAuditVisualBoardProps {
  result: CLGAuditResult | null;
  homepageUrl: string;
  visibleRecommendations: CLGRecommendation[];
  className?: string;
}

function DotGrid({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.2]',
        className,
      )}
      style={{
        backgroundImage: 'radial-gradient(hsl(var(--border)) 1px, transparent 1px)',
        backgroundSize: '14px 14px',
      }}
    />
  );
}

function StickyNote({
  text,
  top,
  left,
  rotate,
  accent,
}: {
  text: string;
  top: number;
  left: number;
  rotate: number;
  accent: 'amber' | 'rose' | 'violet';
}) {
  const border =
    accent === 'rose'
      ? 'border-rose-300/80 dark:border-rose-600/50'
      : accent === 'violet'
        ? 'border-violet-300/80 dark:border-violet-600/50'
        : 'border-amber-300/80 dark:border-amber-600/50';
  const bg =
    accent === 'rose'
      ? 'bg-rose-50/95 dark:bg-rose-950/40'
      : accent === 'violet'
        ? 'bg-violet-50/95 dark:bg-violet-950/40'
        : 'bg-[#fff8dc]/95 dark:bg-amber-950/30';
  const pointer =
    accent === 'rose'
      ? 'border-r-rose-400/90 dark:border-r-rose-500'
      : accent === 'violet'
        ? 'border-r-violet-400/90 dark:border-r-violet-500'
        : 'border-r-amber-500/90 dark:border-r-amber-600';

  return (
    <div
      className="pointer-events-none absolute z-20 max-w-[200px] sm:max-w-[220px]"
      style={{ top: `${top}%`, left: `${left}%`, transform: `rotate(${rotate}deg)` }}
    >
      <div
        className={cn(
          'relative rounded-sm border-2 px-2.5 py-2 text-left shadow-md',
          border,
          bg,
        )}
      >
        <div
          className={cn(
            'absolute -left-1 top-3 h-0 w-0 border-y-6 border-y-transparent border-r-8',
            pointer,
          )}
          aria-hidden
        />
        <p className="font-display text-[11px] font-medium leading-snug text-foreground">{text}</p>
      </div>
    </div>
  );
}

export function CLGAuditVisualBoard({
  result,
  homepageUrl,
  visibleRecommendations,
  className,
}: CLGAuditVisualBoardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const previewSrc = useMemo(() => homepagePreviewImageUrl(homepageUrl), [homepageUrl]);

  useEffect(() => {
    setImgFailed(false);
  }, [previewSrc]);

  const criteriaItems = useMemo(() => {
    if (result) return buildCriteriaRailItems(result);
    return (['A', 'B', 'C', 'D'] as RubricDimension[]).map((dimension) => ({
      dimension,
      hint: RUBRIC_DIMENSION_UI[dimension].short,
    }));
  }, [result]);

  const { benefits, context } = useMemo(
    () => partitionRecommendationsForRail(visibleRecommendations),
    [visibleRecommendations],
  );

  const sectionsPresent = result?.input.sectionsPresent ?? [];
  const seed = result?.runAt ?? (homepageUrl || 'seed');

  const score = result?.score.total ?? null;
  const scoreHue = score != null && score >= 65 ? 'text-success' : 'text-destructive';

  return (
    <div
      id={result ? 'clg-audit-result' : undefined}
      className={cn(
        'flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card to-muted/25 shadow-sm xl:min-h-[520px]',
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 bg-card/80 px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          {score != null ? (
            <span
              className={cn(
                'font-display text-4xl font-bold tabular-nums leading-none tracking-tight sm:text-5xl',
                scoreHue,
              )}
            >
              {score}
            </span>
          ) : (
            <span className="font-display text-3xl font-semibold text-muted-foreground">—</span>
          )}
          <div>
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Homepage check
            </h2>
            {result ? (
              <p className="mt-1 max-w-md text-sm font-medium text-foreground">{publicBandLabel(result.band)}</p>
            ) : (
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Run Quick estimate or Live scan to tag wording, positioning, and rubric dimensions on your preview.
              </p>
            )}
          </div>
        </div>
        {homepageUrl.trim() ? (
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5" asChild>
            <a href={homepageUrl.includes('://') ? homepageUrl : `https://${homepageUrl}`} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Open site
            </a>
          </Button>
        ) : null}
      </header>

      <div className="flex flex-1 flex-col gap-0 xl:flex-row">
        {/* Left rail — positioning criteria */}
        <aside className="flex shrink-0 flex-row gap-2 overflow-x-auto border-b border-border/50 p-3 xl:w-[11.5rem] xl:flex-col xl:gap-2 xl:border-b-0 xl:border-r xl:overflow-x-visible xl:overflow-y-auto">
          <p className="hidden text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground xl:block">
            Rubric lens
          </p>
          {criteriaItems.map(({ dimension, hint }) => {
            const ui = RUBRIC_DIMENSION_UI[dimension];
            return (
              <div
                key={dimension}
                className={cn(
                  'min-w-[140px] rounded-lg border bg-card/90 px-2.5 py-2 shadow-sm xl:min-w-0',
                  ui.railClass,
                )}
              >
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-foreground">{ui.label}</p>
                <p className="mt-0.5 text-[0.65rem] leading-snug text-muted-foreground">{hint}</p>
              </div>
            );
          })}
          {result && sectionsPresent.length > 0 ? (
            <div className="mt-1 hidden xl:block">
              <p className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                Sections flagged
              </p>
              <div className="flex flex-col gap-1">
                {sectionsPresent.map((id) => (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="w-fit justify-start text-[0.65rem] font-normal"
                  >
                    {SECTION_LABELS[id] ?? id} ✓
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </aside>

        {/* Center — screenshot canvas */}
        <div className="relative min-h-[280px] flex-1 bg-muted/15">
          <DotGrid />
          <div className="relative mx-auto max-h-[min(72vh,900px)] overflow-y-auto">
            {!previewSrc || imgFailed ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 p-8 text-center">
                <ImageOff className="h-10 w-10 text-muted-foreground" />
                <p className="max-w-sm text-sm text-muted-foreground">
                  Add a full URL to preview the page. If the thumbnail service is blocked, use{' '}
                  <span className="font-medium text-foreground">Open site</span> or run a live scan for extracted hero copy.
                </p>
              </div>
            ) : (
              <div className="relative w-full">
                <img
                  src={previewSrc}
                  alt=""
                  className="relative z-0 w-full object-top"
                  loading="lazy"
                  onError={() => setImgFailed(true)}
                />
                {result && result.topIssues.length > 0
                  ? result.topIssues.map((issue, i) => {
                      const dim = dimensionFromIssue(issue);
                      const accent: 'amber' | 'rose' | 'violet' =
                        dim === 'A' ? 'violet' : dim === 'D' ? 'rose' : 'amber';
                      const { top, left, rotate } = stickySlot(seed, i);
                      const text = truncateNote(issue.diagnosis || issue.quote, 100);
                      return <StickyNote key={`${issue.quote}-${i}`} text={text} top={top} left={left} rotate={rotate} accent={accent} />;
                    })
                  : null}
              </div>
            )}
          </div>
        </div>

        {/* Right rail — problems & moves */}
        <aside className="flex shrink-0 flex-col gap-3 border-t border-border/50 p-3 xl:w-[13.5rem] xl:border-l xl:border-t-0">
          {result && result.topIssues.length > 0 ? (
            <div>
              <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wider text-destructive">Friction</p>
              <div className="flex flex-col gap-1.5">
                {result.topIssues.map((issue, i) => {
                  const dim = dimensionFromIssue(issue) as RubricDimension | null;
                  const chip = dim ? RUBRIC_DIMENSION_UI[dim].chipClass : 'bg-muted text-foreground border-border';
                  return (
                    <div
                      key={`p-${issue.quote}-${i}`}
                      className={cn('rounded-md border px-2 py-1.5 text-[0.7rem] leading-snug', chip)}
                    >
                      {truncateNote(issue.diagnosis || issue.quote, 110)}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {benefits.length > 0 ? (
            <div>
              <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wider text-success dark:text-success">
                Next moves
              </p>
              <div className="flex flex-col gap-1.5">
                {benefits.map((t, i) => (
                  <div
                    key={`b-${i}`}
                    className="rounded-md border border-success/30 bg-success-muted/40 px-2 py-1.5 text-[0.7rem] leading-snug text-foreground dark:bg-success-muted/15"
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {context.length > 0 ? (
            <div>
              <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">More context</p>
              <div className="flex flex-col gap-1.5">
                {context.map((t, i) => (
                  <div
                    key={`c-${i}`}
                    className="rounded-md border border-border/80 bg-muted/40 px-2 py-1.5 text-[0.65rem] leading-snug text-muted-foreground"
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {result?.snapshotMeta?.headlineQuote ? (
            <div className="rounded-lg border border-border/70 bg-card/80 p-2">
              <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground">Hero line</p>
              <p className="mt-1 text-[0.7rem] leading-snug text-foreground">
                {truncateNote(result.snapshotMeta.headlineQuote, 140)}
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
