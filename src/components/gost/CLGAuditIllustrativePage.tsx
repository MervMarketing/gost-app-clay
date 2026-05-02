import { useMemo } from 'react';
import type { CLGAuditIssue, CLGAuditResult } from '@/types/gost';
import { cn } from '@/lib/utils';
import {
  ILLUSTRATIVE_SECTIONS,
  bucketIssuesBySection,
  dimensionFromIssue,
  stickySlot,
  truncateNote,
  type IllustrativeSectionId,
} from '@/lib/clgAuditVisual';

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
      className="pointer-events-none absolute z-10 max-w-[min(92%,200px)]"
      style={{ top: `${top}%`, left: `${left}%`, transform: `rotate(${rotate}deg)` }}
    >
      <div
        className={cn(
          'relative rounded-sm border-2 px-2 py-1.5 text-left shadow-md',
          border,
          bg,
        )}
      >
        <div
          className={cn(
            'absolute -left-1 top-2.5 h-0 w-0 border-y-[5px] border-y-transparent border-r-[7px]',
            pointer,
          )}
          aria-hidden
        />
        <p className="font-display text-[10px] font-medium leading-snug text-foreground">{text}</p>
      </div>
    </div>
  );
}

interface CLGAuditIllustrativePageProps {
  result: CLGAuditResult | null;
  seed: string;
  className?: string;
}

export function CLGAuditIllustrativePage({ result, seed, className }: CLGAuditIllustrativePageProps) {
  const presentSet = useMemo(() => new Set(result?.input.sectionsPresent ?? []), [result?.input.sectionsPresent]);

  const issuesBySection = useMemo((): Record<IllustrativeSectionId, CLGAuditIssue[]> => {
    if (!result?.topIssues.length) {
      return Object.fromEntries(ILLUSTRATIVE_SECTIONS.map((s) => [s.id, [] as CLGAuditIssue[]])) as Record<
        IllustrativeSectionId,
        CLGAuditIssue[]
      >;
    }
    return bucketIssuesBySection(result.topIssues);
  }, [result]);

  const headlineQuote = result?.snapshotMeta?.headlineQuote?.trim();

  return (
    <div className={cn('relative flex flex-col gap-3 p-4 sm:p-5', className)}>
      <p className="text-center text-[0.65rem] leading-snug text-muted-foreground">
        Illustrative page map — labeled sections, not a live screenshot. Issues are placed by rubric dimension.
      </p>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-2.5">
        {ILLUSTRATIVE_SECTIONS.map((section) => {
          const present = presentSet.has(section.id);
          const sectionIssues = issuesBySection[section.id] ?? [];

          return (
            <div
              key={section.id}
              className={cn(
                'relative min-h-[4.5rem] rounded-xl border-2 px-3 py-2.5 transition-colors',
                present
                  ? 'border-primary/35 bg-card/70 shadow-sm'
                  : 'border-dashed border-muted-foreground/25 bg-muted/15',
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <h3 className="font-display text-[0.7rem] font-bold uppercase tracking-[0.12em] text-foreground">
                  {section.label}
                </h3>
                {present ? (
                  <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-success">In scan</span>
                ) : (
                  <span className="text-[0.6rem] text-muted-foreground">—</span>
                )}
              </div>
              <p className="mt-0.5 text-[0.65rem] leading-snug text-muted-foreground">{section.description}</p>

              <div className="relative mt-2 min-h-[2.25rem]">
                {section.id === 'hero' && headlineQuote ? (
                  <p className="max-w-[95%] rounded border border-border/60 bg-muted/30 px-2 py-1 text-[0.65rem] italic leading-snug text-foreground">
                    “{truncateNote(headlineQuote, 120)}”
                  </p>
                ) : (
                  <div className="space-y-1.5 pr-1">
                    <div
                      className="h-2 rounded bg-muted-foreground/12"
                      style={{ width: section.id === 'hero' ? '88%' : '72%' }}
                    />
                    <div className="h-2 w-[55%] rounded bg-muted-foreground/10" />
                    {section.id === 'hero' || section.id === 'closingCta' ? (
                      <div className="mt-2 h-6 w-24 rounded-md bg-primary/15" />
                    ) : null}
                  </div>
                )}

                {sectionIssues.map((issue, i) => {
                  const dim = dimensionFromIssue(issue);
                  const accent: 'amber' | 'rose' | 'violet' =
                    dim === 'A' ? 'violet' : dim === 'D' ? 'rose' : 'amber';
                  const { top, left, rotate } = stickySlot(`${seed}-${section.id}`, i);
                  const text = truncateNote(issue.diagnosis || issue.quote, 90);
                  return (
                    <StickyNote
                      key={`${section.id}-${issue.quote}-${i}`}
                      text={text}
                      top={Math.min(58, top)}
                      left={Math.min(62, left)}
                      rotate={rotate}
                      accent={accent}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
