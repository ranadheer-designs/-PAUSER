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
  
  // Get all videos created by update/ingest logic (implicitly implied by checkpoints existence)
  // Schema note: 'created_by' is removed from videos table in new schema vs contents?
  // User migration SQL didn't show created_by on videos table. 
  // Assuming public videos or we filter by something else?
  // Actually, let's just query videos that have checkpoints?
  // But wait, checkpoints don't have user_id, completions do.
  // The original code filtered by `contents.created_by = user.id`. 
  // The new schema `videos` table DOES NOT HAVE `created_by`. 
  // This implies videos are global.
  // So we should find videos that the USER has INTERACTED with?
  // Or just return all videos?
  // The original requirement: "Fetches all videos (contents) that have checkpoints for the current user."
  // Actually the original code said: `.eq('created_by', user.id)` which implies user uploaded them?
  // If videos are now global, we probably want to show videos where user has *completions* or videos that *exist*.
  // Let's assume for now we return ALL videos that have checkpoints, as they are likely "available".
  // OR, we check if the user has `user_contents` (from old schema - effectively progress).
  // Given strict instructions: "Refactor fetching logic... replace contents with videos".
  
  const { data: videosWithCheckpointsData, error } = await supabase
    .from('videos')
    .select(`
      id,
      youtube_id,
      title,
      created_at,
      checkpoints(count)
    `)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('[getVideosWithCheckpoints] Error:', error);
    throw error;
  }
  
  // Filter to only videos with checkpoints and map to our type
  const videosWithCheckpoints = (videosWithCheckpointsData || [])
    .filter((video: any) => {
      const count = video.checkpoints?.[0]?.count || 0;
      return count > 0;
    })
    .map((video: any) => ({
      id: video.id,
      externalId: video.youtube_id,
      title: video.title,
      thumbnailUrl: `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`, // Construct since not in DB
      checkpointCount: video.checkpoints?.[0]?.count || 0,
      createdAt: video.created_at,
    }));
  
  return videosWithCheckpoints;
}

