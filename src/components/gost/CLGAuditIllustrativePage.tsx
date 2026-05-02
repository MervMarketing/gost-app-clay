import { useMemo, useRef } from 'react';
import type { CLGAuditResult } from '@/types/gost';
import { cn } from '@/lib/utils';
import { ILLUSTRATIVE_SECTIONS, bucketIssuesBySection, truncateNote, type IllustrativeSectionId } from '@/lib/clgAuditVisual';

interface CLGAuditIllustrativePageProps {
  result: CLGAuditResult | null;
  hoveredSectionId: IllustrativeSectionId | null;
  onHoveredSectionChange: (id: IllustrativeSectionId | null) => void;
  className?: string;
}

export function CLGAuditIllustrativePage({
  result,
  hoveredSectionId,
  onHoveredSectionChange,
  className,
}: CLGAuditIllustrativePageProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const presentSet = useMemo(() => new Set(result?.input.sectionsPresent ?? []), [result?.input.sectionsPresent]);

  const issueCountBySection = useMemo((): Record<IllustrativeSectionId, number> => {
    if (!result?.topIssues.length) {
      return Object.fromEntries(ILLUSTRATIVE_SECTIONS.map((s) => [s.id, 0])) as Record<IllustrativeSectionId, number>;
    }
    const buckets = bucketIssuesBySection(result.topIssues);
    return Object.fromEntries(
      ILLUSTRATIVE_SECTIONS.map((s) => [s.id, buckets[s.id]?.length ?? 0]),
    ) as Record<IllustrativeSectionId, number>;
  }, [result]);

  const headlineQuote = result?.snapshotMeta?.headlineQuote?.trim();

  return (
    <div className={cn('relative flex flex-col gap-3 p-4 sm:p-5', className)}>
      <p className="text-center text-[0.65rem] leading-snug text-muted-foreground">
        Illustrative page map — not a live screenshot.{' '}
        <span className="font-medium text-foreground/80">Hover a section</span> to read mapped notes on the right.
      </p>
      <div
        ref={mapRef}
        className="mx-auto flex w-full max-w-lg flex-col gap-2.5"
        onMouseLeave={() => onHoveredSectionChange(null)}
      >
        {ILLUSTRATIVE_SECTIONS.map((section) => {
          const present = presentSet.has(section.id);
          const nNotes = issueCountBySection[section.id] ?? 0;
          const isActive = hoveredSectionId === section.id;

          return (
            <div
              key={section.id}
              role="group"
              aria-label={`${section.label} section`}
              tabIndex={0}
              className={cn(
                'relative min-h-[4.5rem] cursor-default rounded-xl border-2 px-3 py-2.5 outline-none transition-all duration-200 ease-out',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                present
                  ? 'border-primary/35 bg-card/70 shadow-sm'
                  : 'border-dashed border-muted-foreground/25 bg-muted/15',
                isActive && 'z-[1] scale-[1.01] border-primary/55 shadow-md ring-2 ring-primary/25',
              )}
              onMouseEnter={() => onHoveredSectionChange(section.id)}
              onFocus={() => onHoveredSectionChange(section.id)}
              onBlur={() => {
                queueMicrotask(() => {
                  const root = mapRef.current;
                  const active = document.activeElement;
                  if (!root || !active || !root.contains(active)) {
                    onHoveredSectionChange(null);
                  }
                });
              }}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <h3 className="font-display text-[0.7rem] font-bold uppercase tracking-[0.12em] text-foreground">
                  {section.label}
                </h3>
                <div className="flex items-center gap-2">
                  {nNotes > 0 ? (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[0.6rem] font-medium tabular-nums text-muted-foreground">
                      {nNotes} note{nNotes === 1 ? '' : 's'}
                    </span>
                  ) : null}
                  {present ? (
                    <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-success">In scan</span>
                  ) : (
                    <span className="text-[0.6rem] text-muted-foreground">—</span>
                  )}
                </div>
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
                      className="h-2 rounded bg-muted-foreground/12 transition-opacity duration-200"
                      style={{ width: section.id === 'hero' ? '88%' : '72%', opacity: isActive ? 1 : 0.85 }}
                    />
                    <div className="h-2 w-[55%] rounded bg-muted-foreground/10" />
                    {section.id === 'hero' || section.id === 'closingCta' ? (
                      <div className="mt-2 h-6 w-24 rounded-md bg-primary/15" />
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
