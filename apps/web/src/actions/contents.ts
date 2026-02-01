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
 * Get or create a content record by YouTube video ID.
 * Returns the UUID of the content record.
 */
export async function getOrCreateContent(data: ContentData): Promise<string> {
  const supabase = createClient();
  
  // First, try to find existing content by external_id
  const { data: existing } = await (supabase as any)
    .from('contents')
    .select('id')
    .eq('external_id', data.externalId)
    .eq('type', 'video')
    .single();
  
  if (existing) {
    return existing.id;
  }
  
  // If not found, create new content
  const { data: newContent, error: createError } = await (supabase as any)
    .from('contents')
    .insert({
      type: 'video',
      external_id: data.externalId,
      title: data.title,
      description: data.description,
      thumbnail_url: data.thumbnailUrl,
      duration_seconds: data.durationSeconds,
    })
    .select('id')
    .single();
  
  if (createError) throw createError;
  
  return newContent.id;
}

/**
 * Get content UUID by YouTube video ID.
 * Returns null if not found.
 */
export async function getContentIdByExternalId(externalId: string): Promise<string | null> {
  const supabase = createClient();
  
  const { data } = await (supabase as any)
    .from('contents')
    .select('id')
    .eq('external_id', externalId)
    .eq('type', 'video')
    .single();
  
  if (!data) return null;
  
  return data.id;
}
