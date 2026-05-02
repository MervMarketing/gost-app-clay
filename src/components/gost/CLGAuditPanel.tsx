import { useMemo, useState } from 'react';
import { CLGAuditInput, CLGAuditResult, CLGRecommendation, GOSTData } from '@/types/gost';
import { buildDraftAuditInput, runCLGAudit } from '@/lib/clgAudit';
import { fetchMervSnapshotScan, scanResultToCLGAuditResult } from '@/lib/clgSnapshot';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, Loader2 } from 'lucide-react';
import { CLGAuditVisualBoard } from '@/components/gost/CLGAuditVisualBoard';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const FOUNDER_PHRASES = [
  'End-to-end platform',
  'For businesses of all sizes',
  'AI-powered transformation',
  'Revolutionary solution',
  'Seamless experience',
  'Data-driven decisions',
  'Scale with confidence',
  'Best-in-class',
];

const ESSENTIAL_SECTIONS = [
  { id: 'hero', label: 'Hero' },
  { id: 'differentiation', label: 'Differentiation' },
  { id: 'demo', label: 'Demo / Product proof' },
  { id: 'trust', label: 'Trust / Proof' },
  { id: 'doors', label: 'Offer doors / Paths' },
  { id: 'resources', label: 'Resources' },
  { id: 'closingCta', label: 'Closing CTA' },
];

const MAX_TIER_BY_PLAN_SIZE: Record<'small' | 'standard' | 'full', 1 | 2 | 3> = {
  small: 1,
  standard: 2,
  full: 3,
};

interface CLGAuditPanelProps {
  data: GOSTData;
  onSaveAudit: (audit: CLGAuditResult) => void;
  onCreateRecommendations: (recommendations: CLGRecommendation[]) => void;
}

/** Dev: direct browser → external Snapshot if `VITE_CLG_SNAPSHOT_URL` set; else use `vercel dev` for `/api/clg-snapshot` + `ANTHROPIC_API_KEY`. */
const snapshotDevDirectBase = import.meta.env.VITE_CLG_SNAPSHOT_URL?.trim() || '';
const canRunLiveSnapshot = import.meta.env.PROD || Boolean(snapshotDevDirectBase);

export function CLGAuditPanel({ data, onSaveAudit, onCreateRecommendations }: CLGAuditPanelProps) {
  const existing = (data.clgAudit as CLGAuditResult | undefined) ?? null;
  const [form, setForm] = useState<CLGAuditInput>(
    existing?.input ?? {
      companyName: '',
      homepageUrl: '',
      stage: 'growth',
      companyType: 'services',
      salesModel: 'complex-b2b',
      whatIsIt: 5,
      whoIsItFor: 5,
      whyBetter: 5,
      founderPhrases: [],
      sectionsPresent: ['hero', 'trust'],
      conversionSignals: {
        ctaSpecific: false,
        socialProofCredible: false,
        outcomesFocused: false,
        customerLanguage: false,
      },
      notes: '',
      quoteEvidence: ['', '', ''],
    },
  );
  const [result, setResult] = useState<CLGAuditResult | null>(existing);
  const [deliveryMode, setDeliveryMode] = useState<'diy' | 'dwy' | 'dfy'>('diy');
  const [planSize, setPlanSize] = useState<'small' | 'standard' | 'full'>('small');
  const [unlockedTier, setUnlockedTier] = useState<1 | 2 | 3>(1);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  /** When false, Run applies an auto baseline; when true, Run keeps your checklist & scores. */
  const [manualSignals, setManualSignals] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [offlineBusy, setOfflineBusy] = useState(false);
  const [technicalOpen, setTechnicalOpen] = useState(false);

  const visibleRecommendations = useMemo(() => {
    if (!result) return [];
    const cappedTier = Math.min(unlockedTier, MAX_TIER_BY_PLAN_SIZE[planSize]);
    return result.taggedRecommendations.filter(
      (item) => item.tier <= cappedTier && item.recommendedFor.includes(deliveryMode),
    );
  }, [deliveryMode, planSize, result, unlockedTier]);

  const phraseSummary = useMemo(() => `${form.founderPhrases.length} detected`, [form.founderPhrases.length]);

  const toggleListValue = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const runAudit = () => {
    setSnapshotLoading(false);

    const url = form.homepageUrl.trim();
    if (!url) {
      toast.error('Add your homepage URL in the field above, then run Quick estimate.', {
        duration: 5000,
      });
      return;
    }

    setOfflineBusy(true);
    try {
      const draftShell = buildDraftAuditInput({
        companyName: form.companyName,
        homepageUrl: url,
        stage: form.stage,
        companyType: form.companyType,
        salesModel: form.salesModel,
      });

      const input: CLGAuditInput = manualSignals
        ? {
            ...form,
            companyName: draftShell.companyName,
            homepageUrl: draftShell.homepageUrl,
            stage: draftShell.stage,
            companyType: draftShell.companyType,
            salesModel: draftShell.salesModel,
          }
        : draftShell;

      setForm(input);
      const next = runCLGAudit(input);
      setResult(next);
      onSaveAudit(next);

      toast.success(`Quick estimate done — score ${next.score.total}/100`, { duration: 4000 });

      requestAnimationFrame(() => {
        document.getElementById('clg-audit-result')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Quick estimate failed.');
    } finally {
      setOfflineBusy(false);
    }
  };

  const runLiveSnapshot = async () => {
    if (import.meta.env.DEV && !snapshotDevDirectBase) {
      toast.error(
        'Local dev: run `vercel dev` with ANTHROPIC_API_KEY for Live scan, or set VITE_CLG_SNAPSHOT_URL to call an external scanner. Production: set ANTHROPIC_API_KEY on Vercel (preferred).',
      );
      return;
    }
    const url = form.homepageUrl.trim();
    if (!url) {
      toast.error('Add a homepage URL to scan.');
      return;
    }
    setSnapshotLoading(true);
    try {
      const draftShell = buildDraftAuditInput({
        companyName: form.companyName,
        homepageUrl: url,
        stage: form.stage,
        companyType: form.companyType,
        salesModel: form.salesModel,
      });
      const scan = await fetchMervSnapshotScan(
        draftShell.homepageUrl,
        import.meta.env.DEV ? snapshotDevDirectBase : undefined,
      );
      const next = scanResultToCLGAuditResult(scan, {
        companyName: draftShell.companyName,
        homepageUrl: draftShell.homepageUrl,
        stage: draftShell.stage,
        companyType: draftShell.companyType,
        salesModel: draftShell.salesModel,
      });
      setForm(next.input);
      setResult(next);
      onSaveAudit(next);
      toast.success('Live scan complete — your scores and fixes are ready below.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Snapshot failed.';
      toast.error(message);
    } finally {
      setSnapshotLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr] xl:grid-cols-[minmax(0,24rem)_1fr] xl:items-start">
        <Card className="h-fit border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <CardTitle className="font-display text-xl">Homepage check</CardTitle>
                <p className="max-w-xl text-sm text-muted-foreground">
                  Paste your URL, run a check, get a score out of 100 and a short fix list—about a minute.
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 font-normal text-muted-foreground">
                Start here
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="clg-homepage-url">Homepage URL</Label>
              <Input
                id="clg-homepage-url"
                value={form.homepageUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, homepageUrl: e.target.value }))}
                placeholder="https://yoursite.com"
                className="text-base sm:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clg-company">Company (optional)</Label>
              <Input
                id="clg-company"
                value={form.companyName}
                onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
                placeholder="Leave blank and we will guess from the domain"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {canRunLiveSnapshot ? (
              <Button
                type="button"
                variant="outline"
                className="w-full sm:flex-1"
                size="lg"
                disabled={snapshotLoading}
                onClick={() => void runLiveSnapshot()}
              >
                {snapshotLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Live scan
              </Button>
            ) : null}
            <Button
              type="button"
              variant="default"
              className="w-full sm:flex-1"
              size="lg"
              disabled={offlineBusy}
              onClick={runAudit}
            >
              {offlineBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Quick estimate
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Quick estimate</span> runs instantly.{' '}
            <span className="font-medium text-foreground">Live scan</span> needs your app connected (see developer note
            below).
          </p>

          <Collapsible open={moreOptionsOpen} onOpenChange={setMoreOptionsOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border/80 bg-muted/20 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/40">
              More options
              <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', moreOptionsOpen && 'rotate-180')} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-5 border-t border-border/60 pt-5 mt-2">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <select
                    className="h-11 w-full rounded-[0.6rem] border border-input bg-background px-3.5 text-sm"
                    value={form.stage}
                    onChange={(e) => setForm((prev) => ({ ...prev, stage: e.target.value as CLGAuditInput['stage'] }))}
                  >
                    <option value="pre-seed">Pre-seed</option>
                    <option value="early-growth">Early growth</option>
                    <option value="growth">Growth</option>
                    <option value="mature">Mature</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Company type</Label>
                  <select
                    className="h-11 w-full rounded-[0.6rem] border border-input bg-background px-3.5 text-sm"
                    value={form.companyType}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, companyType: e.target.value as CLGAuditInput['companyType'] }))
                    }
                  >
                    <option value="services">Services</option>
                    <option value="saas">SaaS</option>
                    <option value="ecommerce">Ecommerce</option>
                    <option value="marketplace">Marketplace</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Sales model</Label>
                  <select
                    className="h-11 w-full rounded-[0.6rem] border border-input bg-background px-3.5 text-sm"
                    value={form.salesModel}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, salesModel: e.target.value as CLGAuditInput['salesModel'] }))
                    }
                  >
                    <option value="complex-b2b">Complex B2B</option>
                    <option value="transactional">Transactional</option>
                    <option value="product-led">Product-led</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                These shape which suggestions you see. Skip them if you are unsure—defaults work fine.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>How you get work done (filters list)</Label>
                  <select
                    className="h-11 w-full rounded-[0.6rem] border border-input bg-background px-3.5 text-sm"
                    value={deliveryMode}
                    onChange={(e) => setDeliveryMode(e.target.value as 'diy' | 'dwy' | 'dfy')}
                  >
                    <option value="diy">Mostly in-house (DIY)</option>
                    <option value="dwy">We like help (done with you)</option>
                    <option value="dfy">We prefer outsourcing (done for you)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>How big is this plan? (depth of list)</Label>
                  <select
                    className="h-11 w-full rounded-[0.6rem] border border-input bg-background px-3.5 text-sm"
                    value={planSize}
                    onChange={(e) => {
                      const next = e.target.value as 'small' | 'standard' | 'full';
                      setPlanSize(next);
                      setUnlockedTier(1);
                    }}
                  >
                    <option value="small">Small (essentials)</option>
                    <option value="standard">Standard</option>
                    <option value="full">Full</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/10 px-4 py-3">
                <Switch id="clg-manual-signals" checked={manualSignals} onCheckedChange={setManualSignals} />
                <Label htmlFor="clg-manual-signals" className="cursor-pointer text-sm font-normal leading-snug">
                  I will enter my own scores and checklists (open “Refine homepage signals” below, then turn this on before
                  re-running)
                </Label>
              </div>

              <Collapsible open={refineOpen} onOpenChange={setRefineOpen}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border/80 bg-muted/20 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/40">
                  Refine homepage signals
                  <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', refineOpen && 'rotate-180')} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-5 border-t border-border/60 pt-5 mt-2">
                  <p className="text-xs text-muted-foreground">
                    Optional: paste real homepage quotes or adjust scores after a human read. Turn on the switch above so the
                    next run keeps these fields instead of resetting the baseline.
                  </p>

                  <div className="space-y-3">
                    <Label>Clarity scoring (0-10 each)</Label>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={form.whatIsIt}
                        onChange={(e) => setForm((prev) => ({ ...prev, whatIsIt: Number(e.target.value) || 0 }))}
                        placeholder="What is it?"
                      />
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={form.whoIsItFor}
                        onChange={(e) => setForm((prev) => ({ ...prev, whoIsItFor: Number(e.target.value) || 0 }))}
                        placeholder="Who is it for?"
                      />
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={form.whyBetter}
                        onChange={(e) => setForm((prev) => ({ ...prev, whyBetter: Number(e.target.value) || 0 }))}
                        placeholder="Why better?"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Founder phrases ({phraseSummary})</Label>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {FOUNDER_PHRASES.map((phrase) => (
                        <label key={phrase} className="flex items-center gap-2 rounded-lg border border-border/80 p-2">
                          <Checkbox
                            checked={form.founderPhrases.includes(phrase)}
                            onCheckedChange={() =>
                              setForm((prev) => ({ ...prev, founderPhrases: toggleListValue(prev.founderPhrases, phrase) }))
                            }
                          />
                          <span className="text-xs text-muted-foreground">{phrase}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Essential sections present</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {ESSENTIAL_SECTIONS.map((section) => (
                        <label key={section.id} className="flex items-center gap-2 rounded-lg border border-border/80 p-2">
                          <Checkbox
                            checked={form.sectionsPresent.includes(section.id)}
                            onCheckedChange={() =>
                              setForm((prev) => ({
                                ...prev,
                                sectionsPresent: toggleListValue(prev.sectionsPresent, section.id),
                              }))
                            }
                          />
                          <span className="text-xs text-muted-foreground">{section.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Conversion signals</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        { key: 'ctaSpecific', label: 'Specific outcome CTA' },
                        { key: 'socialProofCredible', label: 'Credible social proof' },
                        { key: 'outcomesFocused', label: 'Outcome-led copy' },
                        { key: 'customerLanguage', label: 'Customer language over buzzwords' },
                      ].map((signal) => (
                        <label key={signal.key} className="flex items-center gap-2 rounded-lg border border-border/80 p-2">
                          <Checkbox
                            checked={form.conversionSignals[signal.key as keyof CLGAuditInput['conversionSignals']]}
                            onCheckedChange={() =>
                              setForm((prev) => ({
                                ...prev,
                                conversionSignals: {
                                  ...prev.conversionSignals,
                                  [signal.key]:
                                    !prev.conversionSignals[signal.key as keyof CLGAuditInput['conversionSignals']],
                                },
                              }))
                            }
                          />
                          <span className="text-xs text-muted-foreground">{signal.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Audit notes</Label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Key quotes, missing anchors, strongest weakness..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Top quote evidence (optional, 3 snippets)</Label>
                    <div className="space-y-2">
                      {[0, 1, 2].map((idx) => (
                        <Input
                          key={idx}
                          value={form.quoteEvidence?.[idx] ?? ''}
                          onChange={(e) =>
                            setForm((prev) => {
                              const next = [...(prev.quoteEvidence ?? ['', '', ''])];
                              next[idx] = e.target.value;
                              return { ...prev, quoteEvidence: next };
                            })
                          }
                          placeholder={`Quote ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={technicalOpen} onOpenChange={setTechnicalOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-dashed border-border/80 bg-muted/10 px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hover:bg-muted/25">
              Hosting setup — live scan (developers)
              <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', technicalOpen && 'rotate-180')} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 border-l-2 border-muted pl-3 pt-3 text-xs text-muted-foreground">
              {import.meta.env.PROD ? (
                <p>
                  <strong className="text-foreground">Preferred:</strong> server env{' '}
                  <code className="rounded bg-muted px-1 py-0.5">ANTHROPIC_API_KEY</code> on this Vercel project (built-in CLG
                  engine at <code className="rounded bg-muted px-1 py-0.5">/api/clg-snapshot</code>).{' '}
                  <strong className="text-foreground">Optional fallback:</strong>{' '}
                  <code className="rounded bg-muted px-1 py-0.5">CLG_SNAPSHOT_URL</code> to proxy an external Snapshot (origin
                  only, no <code className="rounded bg-muted px-1 py-0.5">/api/scan</code>). Redeploy after env changes.
                </p>
              ) : !snapshotDevDirectBase ? (
                <p>
                  Local: run <code className="rounded bg-muted px-1 py-0.5">vercel dev</code> with{' '}
                  <code className="rounded bg-muted px-1 py-0.5">ANTHROPIC_API_KEY</code> in{' '}
                  <code className="rounded bg-muted px-1 py-0.5">.env.local</code> for the built-in scan; or set{' '}
                  <code className="rounded bg-muted px-1 py-0.5">VITE_CLG_SNAPSHOT_URL</code> for a direct browser call (CORS
                  required on that host).
                </p>
              ) : (
                <p>
                  Local direct URL is set (<code className="rounded bg-muted px-1 py-0.5">VITE_CLG_SNAPSHOT_URL</code>).
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {result && result.recommendations.length > 0 && (
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onCreateRecommendations(visibleRecommendations)}
              >
                Add visible recommendations to repository ({visibleRecommendations.length})
              </Button>
              {unlockedTier < MAX_TIER_BY_PLAN_SIZE[planSize] && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setUnlockedTier((prev) => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : prev))}
                >
                  Unlock next tier (currently Tier {unlockedTier})
                </Button>
              )}
            </div>
          )}
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-4">
          <CLGAuditVisualBoard
            result={result}
            homepageUrl={form.homepageUrl}
            visibleRecommendations={visibleRecommendations}
          />
          {result ? (
            <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {result.snapshotMeta?.leakyFunnelHeadline ? (
                    <span>{result.snapshotMeta.leakyFunnelHeadline}</span>
                  ) : (
                    <span>Estimated leak: ~{result.leakEstimate} buyers per 100 visitors.</span>
                  )}
                </p>
                {result.source === 'merv-snapshot' ? (
                  <Badge variant="outline" className="text-[0.65rem]">
                    Live scan
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[0.65rem]">
                    Quick estimate
                  </Badge>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg border border-border/80 bg-card/80 px-2 py-2 text-center text-[0.7rem] tabular-nums">
                  <span className="text-muted-foreground">Clarity</span>
                  <p className="font-display font-semibold text-foreground">{result.score.clarity}/30</p>
                </div>
                <div className="rounded-lg border border-border/80 bg-card/80 px-2 py-2 text-center text-[0.7rem] tabular-nums">
                  <span className="text-muted-foreground">Positioning</span>
                  <p className="font-display font-semibold text-foreground">{result.score.positioning}/30</p>
                </div>
                <div className="rounded-lg border border-border/80 bg-card/80 px-2 py-2 text-center text-[0.7rem] tabular-nums">
                  <span className="text-muted-foreground">Structure</span>
                  <p className="font-display font-semibold text-foreground">{result.score.structure}/20</p>
                </div>
                <div className="rounded-lg border border-border/80 bg-card/80 px-2 py-2 text-center text-[0.7rem] tabular-nums">
                  <span className="text-muted-foreground">Conversion</span>
                  <p className="font-display font-semibold text-foreground">{result.score.conversion}/20</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
