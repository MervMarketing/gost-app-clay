/**
 * JSON shape returned by Claude for the CLG homepage rubric.
 * Keep aligned with `scoringPrompt.ts` and legacy clg-snapshot.
 */

export interface MervEngineScanIssue {
  phrase_id: number | null;
  dimension: 'A' | 'B' | 'C' | 'D';
  what_we_found: string;
  why_it_hurts: string;
  how_to_fix: string;
}

export interface MervEngineDimensionScores {
  clarity: {
    score: number;
    max: 30;
    a1: number;
    a2: number;
    a3: number;
  };
  positioning: {
    score: number;
    max: 30;
    phrases_detected: number[];
  };
  structure: {
    score: number;
    max: 20;
    sections_present: string[];
  };
  conversion: {
    score: number;
    max: 20;
    d1: number;
    d2: number;
    d3: number;
    d4: number;
  };
}

export interface MervEngineScanResult {
  overall_score: number;
  dimension_scores: MervEngineDimensionScores;
  headline_quote: string;
  top_issues: MervEngineScanIssue[];
  leaky_funnel_headline: string;
  scanned_url?: string;
  scanned_at?: string;
}
