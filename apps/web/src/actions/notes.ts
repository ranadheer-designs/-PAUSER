/**
 * Supabase Notes Access Layer
 * 
 * Provides typed CRUD operations for notes table.
 * All operations respect RLS policies (user can only access their own notes).
 * Uses 'as any' casting for Supabase queries to bypass type check issues.
 */

import { createClient } from '@/utils/supabase/client';
import type { Note, NoteWithVideo, CreateNoteInput, UpdateNoteInput } from '@pauser/common';
import type { Database } from '@pauser/common';

type DbNote = Database['public']['Tables']['notes']['Row'];
type DbNoteInsert = Database['public']['Tables']['notes']['Insert'];
type DbNoteUpdate = Database['public']['Tables']['notes']['Update'];

/**
 * Convert database row to domain Note type.
 */
function dbNoteToNote(dbNote: DbNote): Note {
  return {
    id: dbNote.id,
    userId: dbNote.user_id,
    contentId: dbNote.content_id,
    startTimeSeconds: dbNote.start_time_seconds,
    endTimeSeconds: dbNote.end_time_seconds ?? undefined,
    title: dbNote.title ?? undefined,
    body: dbNote.body,
    isDraft: dbNote.is_draft,
    localId: dbNote.local_id ?? undefined,
    syncedAt: dbNote.synced_at ?? undefined,
    createdAt: dbNote.created_at,
    updatedAt: dbNote.updated_at,
  };
}

/**
 * Get all notes for a specific video (for current user).
 */
export async function getNotesByContentId(contentId: string): Promise<Note[]> {
  const supabase = createClient();
  
  const { data, error } = await (supabase as any)
    .from('notes')
    .select('*')
    .eq('content_id', contentId)
    .order('start_time_seconds', { ascending: true });
  
  if (error) throw error;
  
  return (data || []).map(dbNoteToNote);
}

/**
 * Get all notes for current user, grouped by video.
 */
export async function getNotesWithVideos(): Promise<NoteWithVideo[]> {
  const supabase = createClient();
  
  const { data, error } = await (supabase as any)
    .from('notes')
    .select(`
      *,
      videos:content_id (
        id,
        title,
        youtube_id
      )
    `)
    .order('updated_at', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map((row: any) => ({
    ...dbNoteToNote(row),
    video: {
      id: row.videos.id,
      title: row.videos.title,
      thumbnailUrl: `https://img.youtube.com/vi/${row.videos.youtube_id}/hqdefault.jpg`,
      externalId: row.videos.youtube_id,
    },
  }));
}

/**
 * Get a single note by ID.
 */
export async function getNoteById(id: string): Promise<Note | null> {
  const supabase = createClient();
  
  const { data, error } = await (supabase as any)
    .from('notes')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  
  return dbNoteToNote(data);
}

/**
 * Create a new note.
 */
export async function createNote(
  userId: string,
  input: CreateNoteInput
): Promise<Note> {
  const supabase = createClient();
  
  const insertData: DbNoteInsert = {
    user_id: userId,
    content_id: input.contentId,
    start_time_seconds: input.startTimeSeconds,
    end_time_seconds: input.endTimeSeconds,
    title: input.title,
    body: input.body,
    is_draft: input.isDraft ?? true,
  };
  
  const { data, error } = await (supabase as any)
    .from('notes')
    .insert(insertData)
    .select()
    .single();
  
  if (error) throw error;
  
  return dbNoteToNote(data);
}

/**
 * Update an existing note.
 */
export async function updateNote(
  id: string,
  input: UpdateNoteInput
): Promise<Note> {
  const supabase = createClient();
  
  const updateData: DbNoteUpdate = {
    title: input.title,
    body: input.body,
    end_time_seconds: input.endTimeSeconds,
    is_draft: input.isDraft,
    updated_at: new Date().toISOString(),
  };
  
  const { data, error } = await (supabase as any)
    .from('notes')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  
  return dbNoteToNote(data);
}

/**
 * Delete a note.
 */
export async function deleteNote(id: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await (supabase as any)
    .from('notes')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

/**
 * Upsert a note (create or update based on local_id or id).
 * Used for sync operations.
 */
export async function upsertNote(
  userId: string,
  note: Partial<Note> & { body: string; contentId: string; startTimeSeconds: number }
): Promise<Note> {
  const supabase = createClient();
  
  // IMPORTANT: contentId in the Note type is the YouTube video ID (external_id),
  // but the database expects a UUID that references videos.id (formerly contents).
  // We need to look up or create the video record first.
  
  let contentUuid: string;
  
  // Try to find existing content by youtube_id (formerly external_id)
  const { data: existingContent } = await (supabase as any)
    .from('videos')
    .select('id')
    .eq('youtube_id', note.contentId)
    .maybeSingle();
  
  if (existingContent) {
    contentUuid = existingContent.id;
    console.log('[upsertNote] Found existing video:', contentUuid);
  } else {
    // Content doesn't exist yet - fetch YouTube metadata and create record
    console.warn(`[upsertNote] Video not found for youtube_id: ${note.contentId}, creating record with YouTube metadata`);
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    console.log('[upsertNote] Current user:', user?.id || 'NOT AUTHENTICATED');
    
    if (!user) {
      const authError = new Error('User not authenticated. Cannot create content without authentication.');
      console.error('[upsertNote] Authentication required:', authError);
      throw authError;
    }
    
    // Fetch real YouTube video metadata
    const { fetchYouTubeMetadata, getYouTubeThumbnail } = await import('@/utils/youtube/metadata');
    const metadata = await fetchYouTubeMetadata(note.contentId);
    
    const videoTitle = metadata?.title || `Video ${note.contentId}`;
    // thumbnail not in videos table anymore, just title etc
    
    console.log('[upsertNote] Fetched YouTube metadata:', { title: videoTitle });
    
    const { data: newContent, error: createError } = await (supabase as any)
      .from('videos')
      .insert({
        youtube_id: note.contentId,
        title: videoTitle,
        description: null,
      })
      .select('id')
      .single();
    
    if (createError) {
      console.error('[upsertNote] Failed to create video:', createError);
      throw createError;
    }
    
    contentUuid = newContent.id;
    console.log('[upsertNote] Created new video:', contentUuid);
  }
  
  // Generate a proper UUID if the note has a local ID
  let noteId = note.id;
  let localId = note.localId;
  
  if (note.id && note.id.startsWith('local_')) {
    localId = note.id;
    noteId = crypto.randomUUID();
    console.log('[upsertNote] Converting local ID to UUID:', note.id, '->', noteId);
  }
  
  const upsertData: DbNoteInsert = {
    id: noteId,
    user_id: userId,
    content_id: contentUuid,
    start_time_seconds: note.startTimeSeconds,
    end_time_seconds: note.endTimeSeconds,
    title: note.title,
    body: note.body,
    is_draft: note.isDraft ?? true,
    local_id: localId,
    synced_at: new Date().toISOString(),
  };
  
  const { data, error } = await (supabase as any)
    .from('notes')
    .upsert(upsertData, {
      onConflict: 'id',
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return dbNoteToNote(data);
}
