import { useMemo, useState } from 'react';
import { CLGAuditInput, CLGAuditResult, CLGRecommendation, GOSTData } from '@/types/gost';
import { runCLGAudit } from '@/lib/clgAudit';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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

function toBandLabel(band: CLGAuditResult['band']): string {
  if (band === 'strong') return 'Homepage is converting';
  if (band === 'leaking') return 'Leaking buyers';
  if (band === 'losing-room') return 'Losing the room';
  return 'Homepage is sabotaging';
}

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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">CLG Homepage Audit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Company</Label>
              <Input
                value={form.companyName}
                onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
                placeholder="Stoneforge"
              />
            </div>
            <div className="space-y-2">
              <Label>Homepage URL</Label>
              <Input
                value={form.homepageUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, homepageUrl: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>
          </div>

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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Delivery model</Label>
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
              <Label>Plan size</Label>
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
                      setForm((prev) => ({ ...prev, sectionsPresent: toggleListValue(prev.sectionsPresent, section.id) }))
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
                          [signal.key]: !prev.conversionSignals[signal.key as keyof CLGAuditInput['conversionSignals']],
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

          <Button
            onClick={() => {
              const next = runCLGAudit(form);
              setResult(next);
              onSaveAudit(next);
            }}
            className="w-full"
          >
            Run CLG Audit
          </Button>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-lg">Audit Result</CardTitle>
            <Badge variant={result.score.total >= 65 ? 'secondary' : 'destructive'}>
              {result.score.total}/100
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {toBandLabel(result.band)} — estimated loss: ~{result.leakEstimate} buyers per 100 visitors.
            </p>
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
