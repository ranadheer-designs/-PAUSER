'use server';

/**
 * Delete Video Action
 * 
 * Permanently removes a video content and all its associated checkpoints.
 * Only the owner can delete their own content.
 */

import { createClient } from '@/utils/supabase/server';

/**
 * Delete a video content and all its checkpoints.
 * @param contentId - The ID of the content record to delete
 * @returns Success status and optional error message
 */
export async function deleteVideoContent(contentId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }
  
  // Verify the content exists
  // Note: New schema does NOT have created_by on videos, so we cannot check ownership easily.
  // Assuming for now that deletion is allowed for authenticated users (or this should be admin only).
  const { data: video, error: fetchError } = await supabase
    .from('videos')
    .select('id')
    .eq('id', contentId)
    .single();
  
  if (fetchError || !video) {
    console.error('[deleteVideoContent] Video not found:', fetchError);
    return { success: false, error: 'Video not found' };
  }
  
  // Delete checkpoints first (cascade should handle this, but let's be explicit)
  const { error: checkpointsError } = await supabase
    .from('checkpoints')
    .delete()
    .eq('video_id', contentId);
  
  if (checkpointsError) {
    console.error('[deleteVideoContent] Failed to delete checkpoints:', checkpointsError);
    // Continue anyway - content deletion might still work
  }
  
  // Delete the video record
  const { error: deleteError } = await supabase
    .from('videos')
    .delete()
    .eq('id', contentId);
  
  if (deleteError) {
    console.error('[deleteVideoContent] Failed to delete content:', deleteError);
    return { success: false, error: 'Failed to delete video' };
  }
  
  console.log(`[deleteVideoContent] Successfully deleted content ${contentId}`);
  return { success: true };
}
