import { GOSTData } from '@/types/gost';

export const fotofetchPreset: GOSTData = {
  executionGoal: {
    text: "Maintain growth momentum above the $1M ARR trendline while improving activation rates"
  },
  objectives: [
    {
      id: 'obj-1',
      metricName: 'Orders per day',
      baseline: '~19 orders/day',
      target: '24–28 orders/day',
      timeframe: '90 days'
    },
    {
      id: 'obj-2',
      metricName: 'Signup → First Order Conversion',
      baseline: 'Current baseline (to be measured)',
      target: '+30–50% relative improvement',
      timeframe: '90 days'
    },
    {
      id: 'obj-3',
      metricName: 'Time to First Order',
      baseline: 'Multiple days/weeks',
      target: '≤ 3 days (ideally hours)',
      timeframe: '90 days'
    },
    {
      id: 'obj-4',
      metricName: 'Repeat Orders per Account',
      baseline: 'Current baseline (to be measured)',
      target: '+20–30% improvement',
      timeframe: '90 days'
    },
    {
      id: 'obj-5',
      metricName: 'Demand & activation momentum (content-assisted)',
      baseline: 'Low content velocity, minimal attribution',
      target: '2 high-value pieces/week with measurable pipeline contribution',
      timeframe: '90 days'
    }
  ],
  strategies: [
    {
      id: 'str-1',
      statement: 'Buyer-First Funnel Simplification',
      objectiveId: 'obj-2',
      primaryObjectiveId: 'obj-2',
      secondaryObjectiveIds: ['obj-3']
    },
    {
      id: 'str-2',
      statement: 'Activation Before Acquisition',
      objectiveId: 'obj-2',
      primaryObjectiveId: 'obj-2',
      secondaryObjectiveIds: []
    },
    {
      id: 'str-3',
      statement: 'Lifecycle Automation Over Founder Follow-Up',
      objectiveId: 'obj-3',
      primaryObjectiveId: 'obj-3',
      secondaryObjectiveIds: ['obj-2']
    },
    {
      id: 'str-4',
      statement: 'Template-Driven Ordering',
      objectiveId: 'obj-1',
      primaryObjectiveId: 'obj-1',
      secondaryObjectiveIds: ['obj-3']
    },
    {
      id: 'str-5',
      statement: 'Repeat Order Acceleration',
      objectiveId: 'obj-4',
      primaryObjectiveId: 'obj-4',
      secondaryObjectiveIds: []
    },
    {
      id: 'str-6',
      statement: 'Sales-Assist, Not Sales-Gate',
      objectiveId: 'obj-1',
      primaryObjectiveId: 'obj-1',
      secondaryObjectiveIds: ['obj-2']
    },
    {
      id: 'str-7',
      statement: 'Content-led demand capture',
      objectiveId: 'obj-5',
      primaryObjectiveId: 'obj-5',
      secondaryObjectiveIds: []
    },
    {
      id: 'str-8',
      statement: 'Sales enablement content (objection handling)',
      objectiveId: 'obj-5',
      primaryObjectiveId: 'obj-5',
      secondaryObjectiveIds: ['obj-1']
    }
  ],
  tactics: [
    // Strategy 1: Buyer-First Funnel Simplification (supports obj-2: Signup → First Order)
    {
      id: 'tac-1-1',
      description: 'Separate Buyer vs Photographer CTAs on the website',
      status: 'planned',
      strategyId: 'str-1'
    },
    {
      id: 'tac-1-2',
      description: 'Dedicated buyer signup flow',
      status: 'planned',
      strategyId: 'str-1'
    },
    {
      id: 'tac-1-3',
      description: 'Remove non-essential fields from buyer registration',
      status: 'planned',
      strategyId: 'str-1'
    },
    {
      id: 'tac-1-4',
      description: 'Eliminate forced calls before first order',
      status: 'planned',
      strategyId: 'str-1'
    },
    
    // Strategy 2: Activation Before Acquisition (supports obj-2: Signup → First Order)
    {
      id: 'tac-2-1',
      description: 'Pause net-new paid traffic experiments',
      status: 'planned',
      strategyId: 'str-2'
    },
    {
      id: 'tac-2-2',
      description: 'CRO work focused only on activation paths',
      status: 'planned',
      strategyId: 'str-2'
    },
    {
      id: 'tac-2-3',
      description: "Remove dead-end pages that don't lead to ordering",
      status: 'planned',
      strategyId: 'str-2'
    },
    
    // Strategy 3: Lifecycle Automation (supports obj-3: Time to First Order)
    {
      id: 'tac-3-1',
      description: 'Immediate post-signup email: "How to place your first order"',
      status: 'planned',
      strategyId: 'str-3'
    },
    {
      id: 'tac-3-2',
      description: '24-hour no-order reminder',
      status: 'planned',
      strategyId: 'str-3'
    },
    {
      id: 'tac-3-3',
      description: '72-hour no-order use-case nudge',
      status: 'planned',
      strategyId: 'str-3'
    },
    {
      id: 'tac-3-4',
      description: 'CRM-triggered activation flows',
      status: 'planned',
      strategyId: 'str-3'
    },
    
    // Strategy 4: Template-Driven Ordering (supports obj-1: Orders per day)
    {
      id: 'tac-4-1',
      description: 'Default order templates (locations, deliverables, turnaround)',
      status: 'planned',
      strategyId: 'str-4'
    },
    {
      id: 'tac-4-2',
      description: 'Pre-filled examples on first login',
      status: 'planned',
      strategyId: 'str-4'
    },
    {
      id: 'tac-4-3',
      description: '"Most customers start here" framing',
      status: 'planned',
      strategyId: 'str-4'
    },
    
    // Strategy 5: Repeat Order Acceleration (supports obj-4: Repeat Orders)
    {
      id: 'tac-5-1',
      description: '"Reorder last shoot" CTA',
      status: 'planned',
      strategyId: 'str-5'
    },
    {
      id: 'tac-5-2',
      description: '14–30 day reorder reminders',
      status: 'planned',
      strategyId: 'str-5'
    },
    {
      id: 'tac-5-3',
      description: '"Same as last time?" ordering flow',
      status: 'planned',
      strategyId: 'str-5'
    },
    
    // Strategy 6: Sales-Assist (supports obj-1: Orders per day)
    {
      id: 'tac-6-1',
      description: 'Sales engages only after first order or strong buying signal',
      status: 'planned',
      strategyId: 'str-6'
    },
    {
      id: 'tac-6-2',
      description: 'Short async explanations instead of meetings',
      status: 'planned',
      strategyId: 'str-6'
    },
    {
      id: 'tac-6-3',
      description: 'Sales content focused on removing friction, not pitching',
      status: 'planned',
      strategyId: 'str-6'
    },
    
    // Strategy 7: Content-led demand capture (supports obj-5: Content-assisted demand)
    {
      id: 'tac-7-1',
      description: 'Weekly LinkedIn posts on real estate photography tips',
      status: 'planned',
      strategyId: 'str-7'
    },
    {
      id: 'tac-7-2',
      description: 'Case study blog posts with before/after examples',
      status: 'planned',
      strategyId: 'str-7'
    },
    {
      id: 'tac-7-3',
      description: 'Video walkthrough of ordering process',
      status: 'planned',
      strategyId: 'str-7'
    },
    
    // Strategy 8: Sales enablement content (supports obj-5)
    {
      id: 'tac-8-1',
      description: 'Objection handling one-pagers for sales team',
      status: 'planned',
      strategyId: 'str-8'
    },
    {
      id: 'tac-8-2',
      description: 'ROI calculator for property managers',
      status: 'planned',
      strategyId: 'str-8'
    }
  ],
  timeframe: '90-day',
  repository: [
    // Tactics linked to obj-1: Orders per day
    {
      id: 'repo-1',
      type: 'tactic',
      description: 'Add "Quick Order" button on dashboard',
      outcomeSupported: 'obj-1',
      growthStage: 'scaling',
      companyContext: 'small_team',
      abilityToExecute: 'high',
      timeHorizon: 'short',
      status: 'queued',
      createdAt: '2026-01-10T10:00:00Z'
    },
    {
      id: 'repo-2',
      type: 'tactic',
      description: 'Implement bulk order upload via CSV',
      outcomeSupported: 'obj-1',
      growthStage: 'optimization',
      companyContext: 'small_team',
      abilityToExecute: 'medium',
      timeHorizon: 'medium',
      status: 'backlog',
      createdAt: '2026-01-11T09:00:00Z'
    },
    // Tactics linked to obj-2: Signup → First Order Conversion
    {
      id: 'repo-3',
      type: 'tactic',
      description: 'A/B test pricing page layouts',
      outcomeSupported: 'obj-2',
      growthStage: 'scaling',
      companyContext: 'small_team',
      abilityToExecute: 'medium',
      timeHorizon: 'medium',
      status: 'backlog',
      createdAt: '2026-01-12T10:00:00Z'
    },
    {
      id: 'repo-4',
      type: 'tactic',
      description: 'Add social proof testimonials to signup page',
      outcomeSupported: 'obj-2',
      growthStage: 'scaling',
      companyContext: 'small_team',
      abilityToExecute: 'high',
      timeHorizon: 'short',
      status: 'queued',
      createdAt: '2026-01-13T11:00:00Z'
    },
    // Tactics linked to obj-3: Time to First Order
    {
      id: 'repo-5',
      type: 'tactic',
      description: 'In-app onboarding checklist',
      outcomeSupported: 'obj-3',
      growthStage: 'scaling',
      companyContext: 'small_team',
      abilityToExecute: 'high',
      timeHorizon: 'short',
      status: 'queued',
      createdAt: '2026-01-14T09:00:00Z'
    },
    {
      id: 'repo-6',
      type: 'tactic',
      description: 'Video walkthrough for new users',
      outcomeSupported: 'obj-3',
      growthStage: 'scaling',
      companyContext: 'small_team',
      abilityToExecute: 'medium',
      timeHorizon: 'medium',
      status: 'backlog',
      createdAt: '2026-01-14T14:00:00Z'
    },
    // Tactics linked to obj-4: Repeat Orders per Account
    {
      id: 'repo-7',
      type: 'tactic',
      description: 'Implement instant booking for repeat customers',
      outcomeSupported: 'obj-4',
      growthStage: 'optimization',
      companyContext: 'small_team',
      abilityToExecute: 'high',
      timeHorizon: 'short',
      status: 'queued',
      createdAt: '2026-01-15T09:00:00Z'
    },
    {
      id: 'repo-8',
      type: 'tactic',
      description: 'Loyalty discount after 5th order',
      outcomeSupported: 'obj-4',
      growthStage: 'optimization',
      companyContext: 'small_team',
      abilityToExecute: 'medium',
      timeHorizon: 'medium',
      status: 'backlog',
      createdAt: '2026-01-16T10:00:00Z'
    },
    // Strategies in backlog
    {
      id: 'repo-9',
      type: 'strategy',
      description: 'Referral program for existing customers',
      outcomeSupported: 'obj-1',
      growthStage: 'scaling',
      companyContext: 'small_team',
      abilityToExecute: 'low',
      timeHorizon: 'long',
      status: 'backlog',
      createdAt: '2026-01-17T14:00:00Z'
    },
    {
      id: 'repo-10',
      type: 'strategy',
      description: 'Partner integrations with real estate platforms',
      outcomeSupported: 'obj-1',
      growthStage: 'optimization',
      companyContext: 'team',
      abilityToExecute: 'low',
      timeHorizon: 'long',
      status: 'backlog',
      createdAt: '2026-01-18T11:00:00Z'
    },
    // Content tactics linked to obj-5
    {
      id: 'repo-11',
      type: 'tactic',
      description: 'Create podcast episode featuring top real estate agents',
      outcomeSupported: 'obj-5',
      growthStage: 'scaling',
      companyContext: 'small_team',
      abilityToExecute: 'medium',
      timeHorizon: 'medium',
      status: 'backlog',
      createdAt: '2026-01-19T10:00:00Z'
    },
    {
      id: 'repo-12',
      type: 'tactic',
      description: 'LinkedIn carousel: "5 photo mistakes that kill listings"',
      outcomeSupported: 'obj-5',
      growthStage: 'scaling',
      companyContext: 'small_team',
      abilityToExecute: 'high',
      timeHorizon: 'short',
      status: 'queued',
      createdAt: '2026-01-19T14:00:00Z'
    },
    {
      id: 'repo-13',
      type: 'tactic',
      description: 'Monthly newsletter with photography best practices',
      outcomeSupported: 'obj-5',
      growthStage: 'scaling',
      companyContext: 'small_team',
      abilityToExecute: 'high',
      timeHorizon: 'short',
      status: 'queued',
      createdAt: '2026-01-20T09:00:00Z'
    },
    // Orphan items for demo purposes
    {
      id: 'repo-14',
      type: 'tactic',
      description: 'Explore TikTok presence for brand awareness',
      outcomeSupported: null,
      growthStage: 'scaling',
      companyContext: 'small_team',
      abilityToExecute: 'low',
      timeHorizon: 'long',
      status: 'backlog',
      createdAt: '2026-01-21T10:00:00Z'
    },
    {
      id: 'repo-15',
      type: 'tactic',
      description: 'Research competitor pricing strategies',
      outcomeSupported: null,
      growthStage: 'optimization',
      companyContext: 'solo',
      abilityToExecute: 'medium',
      timeHorizon: 'short',
      status: 'backlog',
      createdAt: '2026-01-22T11:00:00Z'
    }
  ],
  clgAudit: {
    runAt: '2026-02-01T10:30:00Z',
    input: {
      companyName: 'Fotofetch',
      homepageUrl: 'https://fotofetch.com',
      stage: 'growth',
      companyType: 'services',
      salesModel: 'complex-b2b',
      whatIsIt: 8,
      whoIsItFor: 7,
      whyBetter: 6,
      founderPhrases: ['For businesses of all sizes', 'Seamless experience'],
      sectionsPresent: ['hero', 'differentiation', 'demo', 'trust', 'closingCta'],
      conversionSignals: {
        ctaSpecific: true,
        socialProofCredible: true,
        outcomesFocused: false,
        customerLanguage: true,
      },
      quoteEvidence: [
        '“Marketing content and photos for modern teams.”',
        '“For businesses of all sizes.”',
        'No clear offer doors between buyers and photographers.',
      ],
      notes: 'Demo audit: starting point before tier unlock flow.',
    },
    score: {
      total: 73,
      clarity: 21,
      positioning: 26,
      structure: 14,
      conversion: 12,
    },
    leakEstimate: 25,
    band: 'leaking',
    topIssues: [
      {
        quote: '“For businesses of all sizes.”',
        diagnosis: 'Audience is too broad; buyers cannot self-identify quickly.',
        fix: 'Replace with one core ICP line (e.g. brokerages + property marketing teams).',
      },
      {
        quote: '“Marketing content and photos for modern teams.”',
        diagnosis: 'Category and promised outcome are vague.',
        fix: 'Name the exact service + measurable result in the hero.',
      },
      {
        quote: 'No clear offer doors between buyers and photographers.',
        diagnosis: 'Visitors lose momentum because paths are mixed.',
        fix: 'Split entry paths with two explicit CTAs above the fold.',
      },
    ],
    recommendations: [
      'Rewrite the hero into a 10-second answer: what this is, who it is for, and the immediate business outcome.',
      'Replace generic founder phrases with concrete anchors: category, audience, use case, and alternative replaced.',
      'Add missing essential sections in this order: Hero, Differentiation, Demo, Trust, Offer Doors, Resources, Closing CTA.',
      'For complex service sales, include a clear qualification path and expectation-setting CTA (diagnostic call, fit criteria, timeline).',
    ],
    taggedRecommendations: [
      {
        text: 'Rewrite hero with category + ICP + measurable outcome.',
        impact: 'high',
        effort: 'medium',
        window: '30-day',
        tier: 1,
        recommendedFor: ['diy', 'dwy', 'dfy'],
      },
      {
        text: 'Split buyer vs photographer offer doors in the top fold.',
        impact: 'high',
        effort: 'medium',
        window: '30-day',
        tier: 1,
        recommendedFor: ['diy', 'dwy', 'dfy'],
      },
      {
        text: 'Add structured proof section with named clients + outcomes.',
        impact: 'high',
        effort: 'high',
        window: '60-day',
        tier: 2,
        recommendedFor: ['dwy', 'dfy'],
      },
      {
        text: 'Refactor full homepage architecture with segment-specific variants.',
        impact: 'medium',
        effort: 'high',
        window: '90-day',
        tier: 3,
        recommendedFor: ['dfy'],
      },
    ],
  },
};
