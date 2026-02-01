'use server';

/**
 * Get Videos with Checkpoints
 * 
 * Fetches all videos (contents) that have checkpoints for the current user.
 * Used on the dashboard to show videos the user can revisit.
 */

import { createClient } from '@/utils/supabase/server';

export interface VideoWithCheckpoints {
  id: string;
  externalId: string;
  title: string;
  thumbnailUrl: string | null;
  checkpointCount: number;
  createdAt: string;
}

/**
 * Get all videos that have checkpoints for the current authenticated user.
 * Returns empty array if user is not authenticated.
 */
export async function getVideosWithCheckpoints(): Promise<VideoWithCheckpoints[]> {
  const supabase = createClient();
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  // Return empty array if not authenticated
  if (!user) {
    return [];
  }
  
  // Get all contents created by this user that have at least one checkpoint
  const { data: contentsWithCheckpoints, error } = await supabase
    .from('contents')
    .select(`
      id,
      external_id,
      title,
      thumbnail_url,
      created_at,
      checkpoints:checkpoints(count)
    `)
    .eq('type', 'video')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('[getVideosWithCheckpoints] Error:', error);
    throw error;
  }
  
  // Filter to only videos with checkpoints and map to our type
  const videosWithCheckpoints = (contentsWithCheckpoints || [])
    .filter((content: any) => {
      const count = content.checkpoints?.[0]?.count || 0;
      return count > 0;
    })
    .map((content: any) => ({
      id: content.id,
      externalId: content.external_id,
      title: content.title,
      thumbnailUrl: content.thumbnail_url,
      checkpointCount: content.checkpoints?.[0]?.count || 0,
      createdAt: content.created_at,
    }));
  
  return videosWithCheckpoints;
}

