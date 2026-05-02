import { useMemo, useState } from 'react';
import { CLGAuditInput, CLGAuditResult, CLGRecommendation, GOSTData } from '@/types/gost';
import { buildDraftAuditInput, publicBandLabel, runCLGAudit } from '@/lib/clgAudit';
import { fetchMervSnapshotScan, scanResultToCLGAuditResult } from '@/lib/clgSnapshot';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, Loader2 } from 'lucide-react';
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

/** Dev-only: direct browser → Snapshot (needs CORS on Snapshot). Prod uses `/api/clg-snapshot` + CLG_SNAPSHOT_URL on Vercel. */
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
  const [contextOpen, setContextOpen] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  /** When false, Run applies an auto baseline; when true, Run keeps your checklist & scores. */
  const [manualSignals, setManualSignals] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [offlineBusy, setOfflineBusy] = useState(false);

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
      toast.error('Add a homepage URL first (the “Homepage URL” field above), then run offline baseline.', {
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

      toast.success(`Offline baseline done — score ${next.score.total}/100`, { duration: 4000 });

      requestAnimationFrame(() => {
        document.getElementById('clg-audit-result')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Offline baseline failed.');
    } finally {
      setOfflineBusy(false);
    }
  };

  const runLiveSnapshot = async () => {
    if (import.meta.env.DEV && !snapshotDevDirectBase) {
      toast.error(
        'Local dev: set VITE_CLG_SNAPSHOT_URL, or run `vercel dev` so /api/clg-snapshot exists. Production: set CLG_SNAPSHOT_URL on Vercel.',
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
      toast.success('Live Snapshot complete — scores match the Merv rubric.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Snapshot failed.';
      toast.error(message);
    } finally {
      setSnapshotLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">CLG Homepage Audit</CardTitle>
          <CardDescription className="leading-relaxed">
            Same methodology as the Merv playbook:{' '}
            <span className="text-foreground/90">Clarity / Positioning / Structure / Conversion</span> (100 pts) per{' '}
            <span className="font-medium text-foreground/90">positioning-scoring-rubric-v1</span>.
            <strong className="font-medium text-foreground">Run live Snapshot</strong> (production) uses this app’s{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/clg-snapshot</code> proxy — set{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">CLG_SNAPSHOT_URL</code> on Vercel (server) to your Snapshot
            base URL. Local dev: set <code className="rounded bg-muted px-1 py-0.5 text-xs">VITE_CLG_SNAPSHOT_URL</code> or run{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">vercel dev</code>.
            <strong className="font-medium text-foreground"> Run offline baseline</strong> works without Snapshot.
            Expand “Refine homepage signals” to paste real quotes or override checks. Then push recommendations into the repository.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="clg-homepage-url">Homepage URL</Label>
              <Input
                id="clg-homepage-url"
                value={form.homepageUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, homepageUrl: e.target.value }))}
                placeholder="Type your URL here, e.g. https://fotofetch.com"
                className="text-base sm:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clg-company">Company (optional)</Label>
              <Input
                id="clg-company"
                value={form.companyName}
                onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
                placeholder="We infer from the domain if you leave this blank"
              />
            </div>
          </div>

          <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border/80 bg-muted/20 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/40">
              Company context (optional)
              <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', contextOpen && 'rotate-180')} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-4">
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
                These tune which recommendations appear (e.g. PLG vs complex B2B). Defaults work if you skip this.
              </p>
            </CollapsibleContent>
          </Collapsible>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Delivery model (filters list)</Label>
              <select
                className="h-11 w-full rounded-[0.6rem] border border-input bg-background px-3.5 text-sm"
                value={deliveryMode}
                onChange={(e) => setDeliveryMode(e.target.value as 'diy' | 'dwy' | 'dfy')}
              >
                <option value="diy">DIY (do it yourself)</option>
                <option value="dwy">DWY (done with you)</option>
                <option value="dfy">DFY (done for you)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Plan size (tier cap)</Label>
              <select
                className="h-11 w-full rounded-[0.6rem] border border-input bg-background px-3.5 text-sm"
                value={planSize}
                onChange={(e) => {
                  const next = e.target.value as 'small' | 'standard' | 'full';
                  setPlanSize(next);
                  setUnlockedTier(1);
                }}
              >
                <option value="small">Small (Tier 1 only)</option>
                <option value="standard">Standard (up to Tier 2)</option>
                <option value="full">Full (up to Tier 3)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {canRunLiveSnapshot ? (
              <Button
                type="button"
                className="w-full sm:flex-1"
                size="lg"
                disabled={snapshotLoading}
                onClick={() => void runLiveSnapshot()}
              >
                {snapshotLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Run live Snapshot
              </Button>
            ) : null}
            <Button
              type="button"
              variant={canRunLiveSnapshot ? 'outline' : 'default'}
              className="w-full sm:flex-1"
              size="lg"
              disabled={offlineBusy}
              onClick={runAudit}
            >
              {offlineBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Run offline baseline
            </Button>
          </div>
          {import.meta.env.PROD ? (
            <p className="text-xs text-muted-foreground">
              Production: add <code className="rounded bg-muted px-1">CLG_SNAPSHOT_URL</code> on Vercel (Snapshot base, e.g.{' '}
              https://snapshot.mervmarketing.com). The app calls it from the server — no CORS setup needed on Snapshot for
              GOST.
            </p>
          ) : !snapshotDevDirectBase ? (
            <p className="text-xs text-muted-foreground">
              Local: add <code className="rounded bg-muted px-1">VITE_CLG_SNAPSHOT_URL</code> for a direct scan, or run{' '}
              <code className="rounded bg-muted px-1">vercel dev</code> to use the proxy.
            </p>
          ) : null}

          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/10 px-4 py-3">
            <Switch id="clg-manual-signals" checked={manualSignals} onCheckedChange={setManualSignals} />
            <Label htmlFor="clg-manual-signals" className="cursor-pointer text-sm font-normal leading-snug">
              Use my manual scores & checklists (expand refine below, then enable this before re-running)
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

      {result && (
        <Card id="clg-audit-result">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-lg">Audit Result</CardTitle>
            <Badge variant={result.score.total >= 65 ? 'secondary' : 'destructive'}>
              {result.score.total}/100
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{publicBandLabel(result.band)}</p>
              {result.snapshotMeta?.leakyFunnelHeadline ? (
                <p>{result.snapshotMeta.leakyFunnelHeadline}</p>
              ) : (
                <p>Estimated leak: ~{result.leakEstimate} buyers per 100 visitors.</p>
              )}
              {result.snapshotMeta?.headlineQuote ? (
                <p className="text-xs">
                  <span className="font-medium text-foreground">Hero (scanned):</span> {result.snapshotMeta.headlineQuote}
                </p>
              ) : null}
              {result.source === 'merv-snapshot' ? (
                <Badge variant="outline" className="mt-1 text-[0.65rem]">
                  Merv CLG Snapshot
                </Badge>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-border/80 p-3 text-xs">Clarity: {result.score.clarity}/30</div>
              <div className="rounded-lg border border-border/80 p-3 text-xs">Positioning: {result.score.positioning}/30</div>
              <div className="rounded-lg border border-border/80 p-3 text-xs">Structure: {result.score.structure}/20</div>
              <div className="rounded-lg border border-border/80 p-3 text-xs">Conversion: {result.score.conversion}/20</div>
            </div>
            <div className="space-y-2">
              {result.topIssues.length > 0 && (
                <>
                  <h4 className="text-sm font-semibold">Top 3 Issues</h4>
                  <ul className="space-y-2">
                    {result.topIssues.map((issue, idx) => (
                      <li key={`${issue.quote}-${idx}`} className="rounded-lg border border-border/80 p-3 text-xs">
                        <div className="mb-2 flex flex-wrap gap-1">
                          {issue.dimension ? (
                            <Badge variant="secondary" className="text-[0.65rem]">
                              Dim {issue.dimension}
                            </Badge>
                          ) : null}
                          {issue.phraseId != null ? (
                            <Badge variant="outline" className="text-[0.65rem]">
                              Phrase #{issue.phraseId}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-muted-foreground"><strong>Quote:</strong> {issue.quote}</p>
                        <p className="mt-1 text-muted-foreground"><strong>Diagnosis:</strong> {issue.diagnosis}</p>
                        <p className="mt-1 text-muted-foreground"><strong>Fix:</strong> {issue.fix}</p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Recommended next actions</h4>
              <ul className="space-y-2">
                {visibleRecommendations.map((item) => (
                  <li key={item.text} className="rounded-lg border border-border/80 bg-muted/30 p-3 text-xs text-muted-foreground">
                    <p>{item.text}</p>
                    <div className="mt-2 flex gap-2">
                      <Badge variant="secondary">tier: {item.tier}</Badge>
                      <Badge variant="outline">impact: {item.impact}</Badge>
                      <Badge variant="outline">effort: {item.effort}</Badge>
                      <Badge variant="outline">window: {item.window}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
