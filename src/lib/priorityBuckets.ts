import { RepositoryItem, Objective, ExecutionWindow, AbilityToExecute, TimeHorizon } from '@/types/gost';

export type PriorityBucket = 'quick-wins' | 'phase-2' | 'later' | 'cut-candidate';

export interface PriorityBucketConfig {
  id: PriorityBucket;
  label: string;
  emoji: string;
  description: string;
  shortDescription: string; // For "Why" line in UI
  color: string;
  bgColor: string;
}

export const PRIORITY_BUCKET_CONFIG: Record<PriorityBucket, PriorityBucketConfig> = {
  'quick-wins': {
    id: 'quick-wins',
    label: 'Quick Win',
    emoji: '🚀',
    description: 'High ability, 30-day window, active objective',
    shortDescription: 'High ability + 30 days + active objective',
    color: 'text-success',
    bgColor: 'bg-success-muted'
  },
  'phase-2': {
    id: 'phase-2',
    label: 'Phase 2',
    emoji: '⚙️',
    description: 'Medium/high ability, 60-day window, active objective',
    shortDescription: 'Good ability + 60 days + active objective',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  'later': {
    id: 'later',
    label: 'Later',
    emoji: '🧪',
    description: 'Low ability, 90-day window, or inactive objective',
    shortDescription: 'Needs more time or resources',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted'
  },
  'cut-candidate': {
    id: 'cut-candidate',
    label: 'Cut Candidate',
    emoji: '🗑',
    description: 'Low ability + 90-day window — consider cutting',
    shortDescription: 'Low ability + long horizon',
    color: 'text-warning',
    bgColor: 'bg-warning-muted'
  }
};

/**
 * Convert legacy timeHorizon to executionWindow
 */
export function migrateTimeHorizonToExecutionWindow(timeHorizon: TimeHorizon): ExecutionWindow {
  switch (timeHorizon) {
    case 'short': return '30-day';
    case 'medium': return '60-day';
    case 'long': return '90-day';
    default: return '90-day';
  }
}

/**
 * Get the effective execution window for a repository item
 * Uses executionWindow if set, otherwise falls back to migrated timeHorizon
 */
export function getEffectiveExecutionWindow(item: RepositoryItem): ExecutionWindow {
  if (item.executionWindow) {
    return item.executionWindow;
  }
  // Migrate from legacy timeHorizon
  return migrateTimeHorizonToExecutionWindow(item.timeHorizon);
}

/**
 * Derive priority bucket from repository item fields
 * Priority is derived, not manually set, based on:
 * - Ability to Execute
 * - Execution Window (or migrated from Time Horizon)
 * - Whether primary objective is active this cycle
 * - Optional: external budget can down-rank
 */
export function derivePriorityBucket(
  item: RepositoryItem,
  activeObjectiveIds: Set<string>
): PriorityBucket {
  // Cut items are excluded from priority
  if (item.status === 'cut' || item.status === 'completed' || item.status === 'promoted') {
    return 'later'; // Not applicable, but return something
  }

  const hasActiveObjective = item.outcomeSupported ? activeObjectiveIds.has(item.outcomeSupported) : false;
  const ability = item.abilityToExecute;
  const window = getEffectiveExecutionWindow(item);
  const hasBudget = item.hasBudget || false;

  // Cut Candidate: Low ability + 90-day window
  if (ability === 'low' && window === '90-day') {
    return 'cut-candidate';
  }

  // Quick Wins: High ability + 30-day window + Active objective
  // Budget items get slightly down-ranked (less "quick" due to external dependency)
  if (ability === 'high' && window === '30-day' && hasActiveObjective && !hasBudget) {
    return 'quick-wins';
  }

  // Phase 2: Medium/High ability + 30/60-day window + Active objective
  if ((ability === 'medium' || ability === 'high') && (window === '30-day' || window === '60-day') && hasActiveObjective) {
    return 'phase-2';
  }

  // Also Phase 2: High ability + 30-day window but with budget (external dependency)
  if (ability === 'high' && window === '30-day' && hasActiveObjective && hasBudget) {
    return 'phase-2';
  }

  // Also Phase 2: High ability + short window but no active objective (could become quick win)
  if (ability === 'high' && window === '30-day' && !hasActiveObjective) {
    return 'phase-2';
  }

  // Later: Everything else
  return 'later';
}

/**
 * Generate a "Why" explanation for the priority bucket
 */
export function getPriorityWhyLine(
  item: RepositoryItem,
  activeObjectiveIds: Set<string>
): string {
  const hasActiveObjective = item.outcomeSupported ? activeObjectiveIds.has(item.outcomeSupported) : false;
  const ability = item.abilityToExecute;
  const window = getEffectiveExecutionWindow(item);
  const hasBudget = item.hasBudget || false;

  const abilityLabel = ability === 'high' ? 'High' : ability === 'medium' ? 'Med' : 'Low';
  const windowLabel = window === '30-day' ? '30d' : window === '60-day' ? '60d' : '90d';
  const objectiveLabel = hasActiveObjective ? 'active obj' : 'no active obj';
  const budgetNote = hasBudget ? ' + budget' : '';

  return `${abilityLabel} ability + ${windowLabel} + ${objectiveLabel}${budgetNote}`;
}

/**
 * Keyword-based objective suggestion heuristics
 * Returns suggested objective ID based on description keywords
 */
export interface ObjectiveSuggestion {
  objectiveId: string;
  confidence: 'suggested' | 'low';
  matchedKeywords: string[];
}

const KEYWORD_PATTERNS: Record<string, string[]> = {
  // Activation / Conversion keywords
  activation: ['activation', 'first order', 'convert', 'signup', 'onboard', 'trial', 'start'],
  // Speed / Efficiency keywords  
  speed: ['speed', 'automation', 'lifecycle', 'time-to', 'faster', 'automate', 'workflow'],
  // Retention / Repeat keywords
  retention: ['repeat', 'reorder', 'template', 'retention', 'churn', 'loyalty', 'recurring'],
  // Demand / Content keywords
  demand: ['content', 'linkedin', 'blog', 'video', 'demand', 'awareness', 'visibility', 'social', 'seo']
};

export function suggestObjectiveForDescription(
  description: string,
  objectives: Objective[]
): ObjectiveSuggestion | null {
  if (!description || objectives.length === 0) return null;

  const lowerDesc = description.toLowerCase();
  
  // Check each objective for keyword matches
  for (const objective of objectives) {
    const objName = objective.metricName.toLowerCase();
    
    // Direct match with objective name
    if (lowerDesc.includes(objName) || objName.split(' ').some(word => 
      word.length > 3 && lowerDesc.includes(word)
    )) {
      return {
        objectiveId: objective.id,
        confidence: 'suggested',
        matchedKeywords: [objective.metricName]
      };
    }
  }

  // Pattern-based matching
  const matchedPatterns: { pattern: string; keywords: string[] }[] = [];
  
  for (const [pattern, keywords] of Object.entries(KEYWORD_PATTERNS)) {
    const matched = keywords.filter(kw => lowerDesc.includes(kw));
    if (matched.length > 0) {
      matchedPatterns.push({ pattern, keywords: matched });
    }
  }

  if (matchedPatterns.length === 0) return null;

  // Find objective that best matches the patterns
  const bestPattern = matchedPatterns.sort((a, b) => b.keywords.length - a.keywords.length)[0];
  
  // Try to match pattern to objective
  for (const objective of objectives) {
    const objName = objective.metricName.toLowerCase();
    
    // Check if objective name contains pattern-related terms
    if (bestPattern.pattern === 'activation' && 
        (objName.includes('activation') || objName.includes('convert') || objName.includes('first'))) {
      return {
        objectiveId: objective.id,
        confidence: 'suggested',
        matchedKeywords: bestPattern.keywords
      };
    }
    
    if (bestPattern.pattern === 'speed' && 
        (objName.includes('time') || objName.includes('speed') || objName.includes('automation'))) {
      return {
        objectiveId: objective.id,
        confidence: 'suggested',
        matchedKeywords: bestPattern.keywords
      };
    }
    
    if (bestPattern.pattern === 'retention' && 
        (objName.includes('repeat') || objName.includes('retention') || objName.includes('order'))) {
      return {
        objectiveId: objective.id,
        confidence: 'suggested',
        matchedKeywords: bestPattern.keywords
      };
    }
    
    if (bestPattern.pattern === 'demand' && 
        (objName.includes('demand') || objName.includes('content') || objName.includes('visibility'))) {
      return {
        objectiveId: objective.id,
        confidence: 'suggested',
        matchedKeywords: bestPattern.keywords
      };
    }
  }

  // Low confidence match - just return first objective as default with low confidence
  return {
    objectiveId: objectives[0].id,
    confidence: 'low',
    matchedKeywords: bestPattern.keywords
  };
}
