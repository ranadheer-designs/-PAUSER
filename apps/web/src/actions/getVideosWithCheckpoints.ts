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
  
  // Get videos belonging to the current user (user_id filter + RLS)
  const { data: videosWithCheckpointsData, error } = await supabase
    .from('videos')
    .select(`
      id,
      youtube_id,
      title,
      created_at,
      checkpoints(count)
    `)
    .eq('user_id', user.id)
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

