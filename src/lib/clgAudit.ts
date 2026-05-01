import { CLGAuditInput, CLGAuditIssue, CLGAuditResult, CLGRecommendation } from '@/types/gost';

const FOUNDER_PHRASE_PENALTY = 2;

const STRUCTURE_WEIGHTS: Record<string, number> = {
  hero: 4,
  differentiation: 4,
  demo: 3,
  trust: 3,
  doors: 2,
  resources: 2,
  closingCta: 2,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function nearestFive(value: number): number {
  return Math.round(value / 5) * 5;
}

function getBand(total: number): CLGAuditResult['band'] {
  if (total >= 85) return 'strong';
  if (total >= 65) return 'leaking';
  if (total >= 40) return 'losing-room';
  return 'sabotaging';
}

function tagRecommendation(text: string): CLGRecommendation {
  if (text.includes('Hero') || text.includes('hero')) {
    return {
      text,
      impact: 'high',
      effort: 'medium',
      window: '30-day',
      tier: 1,
      recommendedFor: ['diy', 'dwy', 'dfy'],
    };
  }
  if (text.includes('sections') || text.includes('CTA')) {
    return {
      text,
      impact: 'high',
      effort: 'high',
      window: '60-day',
      tier: 2,
      recommendedFor: ['dwy', 'dfy'],
    };
  }
  if (text.includes('SaaS') || text.includes('product-led')) {
    return {
      text,
      impact: 'medium',
      effort: 'medium',
      window: '30-day',
      tier: 1,
      recommendedFor: ['diy', 'dwy', 'dfy'],
    };
  }
  if (text.includes('mature') || text.includes('architecture')) {
    return {
      text,
      impact: 'medium',
      effort: 'high',
      window: '90-day',
      tier: 3,
      recommendedFor: ['dfy'],
    };
  }
  return {
    text,
    impact: 'medium',
    effort: 'low',
    window: '30-day',
    tier: 1,
    recommendedFor: ['diy', 'dwy', 'dfy'],
  };
}

export function runCLGAudit(input: CLGAuditInput): CLGAuditResult {
  const clarity = clamp(input.whatIsIt + input.whoIsItFor + input.whyBetter, 0, 30);
  const positioning = clamp(30 - input.founderPhrases.length * FOUNDER_PHRASE_PENALTY, 0, 30);
  const structure = clamp(
    input.sectionsPresent.reduce((sum, key) => sum + (STRUCTURE_WEIGHTS[key] ?? 0), 0),
    0,
    20,
  );
  const conversion = [
    input.conversionSignals.ctaSpecific,
    input.conversionSignals.socialProofCredible,
    input.conversionSignals.outcomesFocused,
    input.conversionSignals.customerLanguage,
  ].reduce((sum, enabled) => sum + (enabled ? 5 : 0), 0);
  const total = clamp(clarity + positioning + structure + conversion, 0, 100);
  const leakEstimate = nearestFive(100 - total);
  const band = getBand(total);

  const recommendations: string[] = [];
  const topIssues: CLGAuditIssue[] = [];

  const fallbackQuote = (idx: number): string =>
    input.quoteEvidence?.[idx]?.trim() || 'Homepage copy is generic or unclear in critical sections.';

  if (clarity < 20) {
    topIssues.push({
      quote: fallbackQuote(0),
      diagnosis: 'Visitors cannot quickly understand what this is, who it is for, and why it matters.',
      fix: 'Rewrite the hero into a specific 10-second statement: category + ICP + concrete business outcome.',
    });
    recommendations.push(
      'Rewrite the hero into a 10-second answer: what this is, who it is for, and the immediate business outcome.',
    );
  }
  if (positioning < 20) {
    const phrase = input.founderPhrases[0] ? `"${input.founderPhrases[0]}"` : fallbackQuote(1);
    topIssues.push({
      quote: phrase,
      diagnosis: 'Founder-phrase language reduces distinctiveness and weakens buying confidence.',
      fix: 'Replace generic claims with sharp positioning anchors: audience, job-to-be-done, and alternative replaced.',
    });
    recommendations.push(
      'Replace generic founder phrases with concrete anchors: category, audience, use case, and alternative replaced.',
    );
  }
  if (structure < 14) {
    topIssues.push({
      quote: fallbackQuote(2),
      diagnosis: 'Missing core homepage sections causes message drop-off before trust and action are earned.',
      fix: 'Add missing sections in order: Hero, Differentiation, Demo, Trust, Offer Doors, Resources, Closing CTA.',
    });
    recommendations.push(
      'Add missing essential sections in this order: Hero, Differentiation, Demo, Trust, Offer Doors, Resources, Closing CTA.',
    );
  }
  if (conversion < 15) {
    recommendations.push(
      'Tighten conversion cues: specific CTA, named proof, outcome-oriented copy, and direct customer language.',
    );
  }

  if (input.stage === 'pre-seed' || input.stage === 'early-growth') {
    recommendations.push(
      'For early-stage teams, prioritize ICP specificity over broad TAM language; clarity is more valuable than completeness.',
    );
  }
  if (input.companyType === 'services' || input.salesModel === 'complex-b2b') {
    recommendations.push(
      'For complex service sales, include a clear qualification path and expectation-setting CTA (diagnostic call, fit criteria, timeline).',
    );
  }
  if (input.companyType === 'saas' || input.salesModel === 'product-led') {
    recommendations.push(
      'For SaaS/product-led motion, make first value obvious: show product proof early and define first-session success.',
    );
  }

  if (input.companyType === 'ecommerce' || input.salesModel === 'transactional') {
    recommendations.push(
      'For transactional/ecommerce motion, surface proof and CTA high on page, minimize abstract positioning blocks, and tighten offer clarity.',
    );
  }
  if (input.stage === 'mature') {
    recommendations.push(
      'For mature companies, prioritize message architecture consistency across segments and remove legacy copy that conflicts with current offer.',
    );
  }

  const taggedRecommendations = recommendations.slice(0, 6).map(tagRecommendation);

  return {
    runAt: new Date().toISOString(),
    input,
    score: {
      total,
      clarity,
      positioning,
      structure,
      conversion,
    },
    leakEstimate,
    band,
    topIssues: topIssues.slice(0, 3),
    recommendations: recommendations.slice(0, 6),
    taggedRecommendations,
  };
}
