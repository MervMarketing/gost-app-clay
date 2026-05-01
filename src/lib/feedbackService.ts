import { supabase } from '@/integrations/supabase/client';

export type ClientPriority = 'high' | 'medium' | 'low' | 'scratch';

export interface TacticFeedback {
  tactic_id: string;
  priority: ClientPriority;
  note?: string;
}

export interface FeedbackRecord {
  id: string;
  share_id: string;
  tactic_id: string;
  priority: ClientPriority;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export const PRIORITY_CONFIG: Record<ClientPriority, { label: string; emoji: string; color: string; bgColor: string }> = {
  high: { label: 'Must do', emoji: '🔥', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  medium: { label: 'Nice', emoji: '⚡', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  low: { label: 'Later', emoji: '🕐', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  scratch: { label: 'Skip', emoji: '✂️', color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

/**
 * Upsert feedback for a tactic on a share link
 */
export async function upsertFeedback(
  shareId: string,
  tacticId: string,
  priority: ClientPriority,
  note?: string
): Promise<boolean> {
  // Try update first, then insert (manual upsert since we can't use .upsert with RLS on anon)
  const { data: existing } = await supabase
    .from('share_feedback')
    .select('id')
    .eq('share_id', shareId)
    .eq('tactic_id', tacticId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('share_feedback')
      .update({ priority, note: note || null, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    return !error;
  } else {
    const { error } = await supabase
      .from('share_feedback')
      .insert({ share_id: shareId, tactic_id: tacticId, priority, note: note || null });
    return !error;
  }
}

/**
 * Get all feedback for a share link
 */
export async function getFeedbackForShare(shareId: string): Promise<FeedbackRecord[]> {
  const { data, error } = await supabase
    .from('share_feedback')
    .select('*')
    .eq('share_id', shareId);

  if (error) {
    console.error('Error fetching feedback:', error);
    return [];
  }
  return (data as unknown as FeedbackRecord[]) || [];
}

/**
 * Get all feedback for a project (across all its share links)
 */
export async function getFeedbackForProject(projectId: string): Promise<FeedbackRecord[]> {
  // Get all share links for this project
  const { data: shares, error: sharesError } = await supabase
    .from('shared_plans')
    .select('id')
    .eq('project_id', projectId);

  if (sharesError || !shares || shares.length === 0) return [];

  const shareIds = shares.map(s => s.id);
  const { data, error } = await supabase
    .from('share_feedback')
    .select('*')
    .in('share_id', shareIds);

  if (error) {
    console.error('Error fetching project feedback:', error);
    return [];
  }
  return (data as unknown as FeedbackRecord[]) || [];
}

/**
 * Delete all feedback for a project (across all its share links)
 */
export async function clearFeedbackForProject(projectId: string): Promise<boolean> {
  const { data: shares, error: sharesError } = await supabase
    .from('shared_plans')
    .select('id')
    .eq('project_id', projectId);

  if (sharesError || !shares || shares.length === 0) return true;

  const shareIds = shares.map(s => s.id);
  const { error } = await supabase
    .from('share_feedback')
    .delete()
    .in('share_id', shareIds);

  if (error) {
    console.error('Error clearing feedback:', error);
    return false;
  }
  return true;
}
