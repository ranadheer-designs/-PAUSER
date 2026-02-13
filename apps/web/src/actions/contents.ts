'use server';

import { createClient } from '@/utils/supabase/server';

interface ContentData {
  externalId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
}

/**
 * Get or create a video record by YouTube video ID, scoped to the current user.
 * Returns the UUID of the videos record.
 */
export async function getOrCreateContent(data: ContentData): Promise<string> {
  const supabase = createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required');
  
  // First, try to find existing video for this user
  const { data: existing } = await (supabase as any)
    .from('videos')
    .select('id')
    .eq('youtube_id', data.externalId)
    .eq('user_id', user.id)
    .maybeSingle();
  
  if (existing) {
    return existing.id;
  }
  
  // If not found, create new video for this user
  const { data: newVideo, error: createError } = await (supabase as any)
    .from('videos')
    .insert({
      youtube_id: data.externalId,
      user_id: user.id,
      title: data.title,
      description: data.description,
    })
    .select('id')
    .single();
  
  if (createError) throw createError;
  
  return newVideo.id;
}

/**
 * Get video UUID by YouTube video ID for the current user.
 * Returns null if not found.
 */
export async function getContentIdByExternalId(externalId: string): Promise<string | null> {
  const supabase = createClient();
  
  // RLS will scope to current user automatically, but be explicit
  const { data } = await (supabase as any)
    .from('videos')
    .select('id')
    .eq('youtube_id', externalId)
    .maybeSingle();
  
  if (!data) return null;
  
  return data.id;
}
