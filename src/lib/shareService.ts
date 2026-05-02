import { supabase } from '@/integrations/supabase/client';
import { GOSTData } from '@/types/gost';
import type { Json } from '@/integrations/supabase/types';
import { getPublicAppOrigin } from '@/lib/appOrigin';
import { encodeGOSTToURL } from '@/lib/gostSerializer';

export type SharePermission = 'view' | 'edit';
export type ShareType = 'snapshot' | 'live';

/** Max length for a legacy ?gost= URL (browser / proxy limits). */
const MAX_LEGACY_URL_LENGTH = 7500;

const SHARE_DB_TIMEOUT_MS = 20000;

export interface CreateShareResult {
  success: boolean;
  /** Full URL for recipients (either ?share=id or ?gost=…). */
  url?: string;
  /** Snapshot link fell back to embedding data in the URL (DB unavailable). */
  isLegacyFallback?: boolean;
  error?: string;
}

interface GetShareResult {
  success: boolean;
  data?: GOSTData;
  permission?: SharePermission;
  shareType?: ShareType;
  error?: string;
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
    Promise.resolve(promise).then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      },
    );
  });
}

/**
 * Builds a self-contained share URL using the legacy ?gost= encoding (no DB).
 * Long plans may exceed browser URL limits — check length before using.
 */
export function buildLegacyGostShareURL(data: GOSTData, permission: SharePermission): string {
  const origin = getPublicAppOrigin();
  const token = encodeGOSTToURL(data, permission);
  return `${origin}/?gost=${encodeURIComponent(token)}`;
}

function tryLegacySnapshotFallback(
  planData: GOSTData,
  permission: SharePermission,
): CreateShareResult | null {
  const url = buildLegacyGostShareURL(planData, permission);
  if (url.length <= MAX_LEGACY_URL_LENGTH) {
    return { success: true, url, isLegacyFallback: true };
  }
  return null;
}

/**
 * Create a snapshot share link by storing the plan data in the database
 */
export async function createShareLink(
  planData: GOSTData,
  permission: SharePermission,
): Promise<CreateShareResult> {
  try {
    const { data: result, error } = await withTimeout(
      supabase
        .from('shared_plans')
        .insert([
          {
            data: planData as unknown as Json,
            permission,
            share_type: 'snapshot',
          },
        ])
        .select('id')
        .single(),
      SHARE_DB_TIMEOUT_MS,
    );

    if (!error && result?.id) {
      return { success: true, url: buildShareURL(result.id) };
    }

    const msg = error?.message ?? 'Could not save share link';
    console.error('Error creating share link:', error);
    const fb = tryLegacySnapshotFallback(planData, permission);
    if (fb) return fb;
    return { success: false, error: msg };
  } catch (err) {
    console.error('Error creating share link:', err);
    const fb = tryLegacySnapshotFallback(planData, permission);
    if (fb) return fb;
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create share link',
    };
  }
}

/**
 * Create a live share link that always shows the current project state
 */
export async function createLiveShareLink(
  projectId: string,
  permission: SharePermission,
): Promise<CreateShareResult> {
  try {
    const { data: result, error } = await withTimeout(
      supabase
        .from('shared_plans')
        .insert([
          {
            data: {} as Json,
            permission,
            share_type: 'live',
            project_id: projectId,
          },
        ])
        .select('id')
        .single(),
      SHARE_DB_TIMEOUT_MS,
    );

    if (!error && result?.id) {
      return { success: true, url: buildShareURL(result.id) };
    }

    console.error('Error creating live share link:', error);
    return {
      success: false,
      error: error?.message ?? 'Could not create live share link',
    };
  } catch (err) {
    console.error('Error creating live share link:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create live share link',
    };
  }
}

/**
 * Fetch shared plan data by share ID (handles both snapshot and live)
 */
export async function getSharedPlan(shareId: string): Promise<GetShareResult> {
  try {
    // First check if it's a snapshot or live link
    const { data: shareInfo, error: infoError } = await supabase
      .from('shared_plans')
      .select('share_type, data, permission, project_id')
      .eq('id', shareId)
      .single();

    if (infoError) {
      console.error('Error fetching shared plan info:', infoError);
      return { success: false, error: 'Share link not found or expired' };
    }

    const shareType = (shareInfo.share_type || 'snapshot') as ShareType;

    if (shareType === 'live' && shareInfo.project_id) {
      // For live links, use the SECURITY DEFINER function to fetch current project data
      const { data: liveData, error: liveError } = await supabase
        .rpc('get_live_shared_plan', { share_id: shareId });

      if (liveError || !liveData || liveData.length === 0) {
        console.error('Error fetching live shared plan:', liveError);
        return { success: false, error: 'Live share link not found or project deleted' };
      }

      return {
        success: true,
        data: liveData[0].data as unknown as GOSTData,
        permission: liveData[0].permission as SharePermission,
        shareType: 'live',
      };
    }

    // Snapshot link - return stored data
    return {
      success: true,
      data: shareInfo.data as unknown as GOSTData,
      permission: shareInfo.permission as SharePermission,
      shareType: 'snapshot',
    };
  } catch (err) {
    console.error('Error fetching shared plan:', err);
    return { success: false, error: 'Failed to load shared plan' };
  }
}

/**
 * Build the full share URL from a share ID
 */
export function buildShareURL(shareId: string): string {
  const origin = getPublicAppOrigin();
  return `${origin}/?share=${shareId}`;
}
