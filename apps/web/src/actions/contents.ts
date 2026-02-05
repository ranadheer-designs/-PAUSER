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
 * Get or create a video record by YouTube video ID.
 * Returns the UUID of the videos record.
 */
export async function getOrCreateContent(data: ContentData): Promise<string> {
  const supabase = createClient();
  
  // First, try to find existing video by youtube_id
  const { data: existing } = await (supabase as any)
    .from('videos')
    .select('id')
    .eq('youtube_id', data.externalId)
    .maybeSingle();
  
  if (existing) {
    return existing.id;
  }
  
  // If not found, create new video
  const { data: newVideo, error: createError } = await (supabase as any)
    .from('videos')
    .insert({
      youtube_id: data.externalId,
      title: data.title,
      description: data.description,
    })
    .select('id')
    .single();
  
  if (createError) throw createError;
  
  return newVideo.id;
}

/**
 * Get video UUID by YouTube video ID.
 * Returns null if not found.
 */
export async function getContentIdByExternalId(externalId: string): Promise<string | null> {
  const supabase = createClient();
  
  const { data } = await (supabase as any)
    .from('videos')
    .select('id')
    .eq('youtube_id', externalId)
    .maybeSingle();
  
  if (!data) return null;
  
  return data.id;
}
