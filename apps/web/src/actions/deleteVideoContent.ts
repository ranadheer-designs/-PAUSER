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
  
  // Verify the content exists and belongs to the user
  const { data: content, error: fetchError } = await supabase
    .from('contents')
    .select('id, created_by')
    .eq('id', contentId)
    .single();
  
  if (fetchError || !content) {
    console.error('[deleteVideoContent] Content not found:', fetchError);
    return { success: false, error: 'Video not found' };
  }
  
  // Check ownership
  if ((content as any).created_by !== user.id) {
    return { success: false, error: 'You do not have permission to delete this video' };
  }
  
  // Delete checkpoints first (cascade should handle this, but let's be explicit)
  const { error: checkpointsError } = await supabase
    .from('checkpoints')
    .delete()
    .eq('content_id', contentId);
  
  if (checkpointsError) {
    console.error('[deleteVideoContent] Failed to delete checkpoints:', checkpointsError);
    // Continue anyway - content deletion might still work
  }
  
  // Delete the content record
  const { error: deleteError } = await supabase
    .from('contents')
    .delete()
    .eq('id', contentId);
  
  if (deleteError) {
    console.error('[deleteVideoContent] Failed to delete content:', deleteError);
    return { success: false, error: 'Failed to delete video' };
  }
  
  console.log(`[deleteVideoContent] Successfully deleted content ${contentId}`);
  return { success: true };
}
