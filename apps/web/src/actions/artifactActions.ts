'use server';

/**
 * Artifact Actions
 * 
 * Server actions for managing learning artifacts.
 * Artifacts are first-class learning objects created from cognitive checkpoints.
 * 
 * Types:
 * - prediction: User's prediction before a reveal
 * - explanation: User teaching a concept back
 * - one_sentence_rule: Compressed understanding in one sentence
 * - snapshot: User freely writing what they understand so far
 * 
 * Note: Uses 'as any' for Supabase queries because learning_artifacts table
 * may not be in the generated types yet. Run supabase db push to sync.
 */

import { createClient } from '@/utils/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface LearningArtifact {
  id: string;
  userId: string;
  contentId: string;
  checkpointId: string | null;
  type: 'prediction' | 'explanation' | 'one_sentence_rule' | 'snapshot';
  userText: string;
  followUpText: string | null;
  promptUsed: string | null;
  requiredKeyword: string | null;
  maxWords: number | null;
  targetAudience: string | null;
  conceptName: string | null;
  revealTimestampSeconds: number | null;
  timestampSeconds: number;
  convertedToFlashcardId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateArtifactInput {
  contentId: string;
  checkpointId?: string;
  type: 'prediction' | 'explanation' | 'one_sentence_rule' | 'snapshot';
  userText: string;
  followUpText?: string;
  promptUsed?: string;
  requiredKeyword?: string;
  maxWords?: number;
  targetAudience?: 'junior' | 'past_self' | 'friend';
  conceptName?: string;
  revealTimestampSeconds?: number;
  timestampSeconds: number;
}

export interface UpdateArtifactInput {
  userText?: string;
  followUpText?: string;
}

export interface ArtifactWithVideoInfo extends LearningArtifact {
  videoTitle: string;
  videoThumbnailUrl: string | null;
  videoExternalId: string;
}

// DB row type for learning_artifacts
interface DbArtifactRow {
  id: string;
  user_id: string;
  content_id: string;
  checkpoint_id: string | null;
  type: string;
  user_text: string;
  follow_up_text: string | null;
  prompt_used: string | null;
  required_keyword: string | null;
  max_words: number | null;
  target_audience: string | null;
  concept_name: string | null;
  reveal_timestamp_seconds: number | null;
  timestamp_seconds: number;
  converted_to_flashcard_id: string | null;
  created_at: string;
  updated_at: string;
  contents?: {
    title?: string;
    thumbnail_url?: string;
    external_id?: string;
  };
}

// ============================================================================
// CREATE ARTIFACT
// ============================================================================

/**
 * Create a new learning artifact.
 */
export async function createArtifact(input: CreateArtifactInput): Promise<LearningArtifact> {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Authentication required to create artifacts');
  }

  const sanitizedText = sanitizeText(input.userText, 5000);
  const sanitizedFollowUp = input.followUpText ? sanitizeText(input.followUpText, 2000) : null;

  if (!sanitizedText) {
    throw new Error('User text is required');
  }

  const insertData = {
    user_id: user.id,
    content_id: input.contentId,
    checkpoint_id: input.checkpointId || null,
    type: input.type,
    user_text: sanitizedText,
    follow_up_text: sanitizedFollowUp,
    prompt_used: input.promptUsed || null,
    required_keyword: input.requiredKeyword || null,
    max_words: input.maxWords || null,
    target_audience: input.targetAudience || null,
    concept_name: input.conceptName || null,
    reveal_timestamp_seconds: input.revealTimestampSeconds || null,
    timestamp_seconds: input.timestampSeconds,
  };

  const { data, error } = await (supabase as any)
    .from('learning_artifacts')
    .insert(insertData)
    .select('*')
    .single();

  if (error) {
    console.error('[createArtifact] Failed:', error);
    throw new Error('Failed to create artifact');
  }

  console.log(`[createArtifact] Created ${input.type} artifact at ${input.timestampSeconds}s`);
  return mapDbToArtifact(data);
}

// ============================================================================
// UPDATE ARTIFACT
// ============================================================================

/**
 * Update an existing artifact.
 */
export async function updateArtifact(
  artifactId: string, 
  input: UpdateArtifactInput
): Promise<LearningArtifact> {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Authentication required');
  }

  const updates: Record<string, any> = {};
  
  if (input.userText !== undefined) {
    updates.user_text = sanitizeText(input.userText, 5000);
  }
  
  if (input.followUpText !== undefined) {
    updates.follow_up_text = sanitizeText(input.followUpText, 2000);
  }

  const { data, error } = await (supabase as any)
    .from('learning_artifacts')
    .update(updates)
    .eq('id', artifactId)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error) {
    console.error('[updateArtifact] Failed:', error);
    throw new Error('Failed to update artifact');
  }

  return mapDbToArtifact(data);
}

// ============================================================================
// GET ARTIFACTS
// ============================================================================

/**
 * Get all artifacts for a specific video (content).
 */
export async function getArtifactsByContentId(contentId: string): Promise<LearningArtifact[]> {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return [];
  }

  const { data, error } = await (supabase as any)
    .from('learning_artifacts')
    .select('*')
    .eq('user_id', user.id)
    .eq('content_id', contentId)
    .order('timestamp_seconds', { ascending: true });

  if (error) {
    console.error('[getArtifactsByContentId] Failed:', error);
    throw new Error('Failed to fetch artifacts');
  }

  return (data || []).map(mapDbToArtifact);
}

/**
 * Get all artifacts for the current user.
 */
export async function getAllUserArtifacts(): Promise<ArtifactWithVideoInfo[]> {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return [];
  }

  const { data, error } = await (supabase as any)
    .from('learning_artifacts')
    .select(`
      *,
      videos:content_id (
        title,
        youtube_id
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getAllUserArtifacts] Failed:', error);
    throw new Error('Failed to fetch artifacts');
  }

  return (data || []).map((row: DbArtifactRow & { videos: any }) => ({
    ...mapDbToArtifact(row),
    videoTitle: row.videos?.title || 'Unknown Video',
    videoThumbnailUrl: row.videos?.youtube_id ? `https://img.youtube.com/vi/${row.videos.youtube_id}/hqdefault.jpg` : null,
    videoExternalId: row.videos?.youtube_id || '',
  }));
}

/**
 * Get unconverted artifacts.
 */
export async function getUnconvertedArtifacts(): Promise<LearningArtifact[]> {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return [];
  }

  const { data, error } = await (supabase as any)
    .from('learning_artifacts')
    .select('*')
    .eq('user_id', user.id)
    .is('converted_to_flashcard_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getUnconvertedArtifacts] Failed:', error);
    throw new Error('Failed to fetch artifacts');
  }

  return (data || []).map(mapDbToArtifact);
}

// ============================================================================
// FLASHCARD CONVERSION
// ============================================================================

/**
 * Convert an artifact to a flashcard.
 */
export async function convertArtifactToFlashcard(artifactId: string): Promise<{ flashcardId: string }> {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Authentication required');
  }

  // Get the artifact
  const { data: artifact, error: artifactError } = await (supabase as any)
    .from('learning_artifacts')
    .select('*')
    .eq('id', artifactId)
    .eq('user_id', user.id)
    .single() as { data: DbArtifactRow | null; error: any };

  if (artifactError || !artifact) {
    throw new Error('Artifact not found');
  }

  // Check if already converted
  if (artifact.converted_to_flashcard_id) {
    return { flashcardId: artifact.converted_to_flashcard_id };
  }

  // Generate flashcard content
  let front: string;
  let back: string;

  switch (artifact.type) {
    case 'prediction':
      front = artifact.prompt_used || `What did you predict about this concept?`;
      back = artifact.user_text;
      if (artifact.follow_up_text) {
        back += `\n\nReflection: ${artifact.follow_up_text}`;
      }
      break;
    
    case 'explanation':
      front = `Explain ${artifact.concept_name || 'this concept'} to a ${
        artifact.target_audience === 'junior' ? 'junior developer' :
        artifact.target_audience === 'past_self' ? 'your past self' :
        'friend'
      }`;
      back = artifact.user_text;
      break;
    
    case 'one_sentence_rule':
      front = `${artifact.concept_name || 'Concept'} in one sentence (include: "${artifact.required_keyword}")`;
      back = artifact.user_text;
      break;

    case 'snapshot':
      front = `What did you understand about ${artifact.concept_name || 'this topic'} at this moment?`;
      back = artifact.user_text;
      break;
    
    default:
      throw new Error('Unknown artifact type');
  }

  // Create the flashcard
  const { data: flashcard, error: flashcardError } = await (supabase as any)
    .from('flashcards')
    .insert({
      user_id: user.id,
      checkpoint_id: artifact.checkpoint_id,
      artifact_id: artifactId,
      front,
      back,
      tags: [artifact.type, 'artifact'],
    })
    .select('id')
    .single() as { data: { id: string } | null; error: any };

  if (flashcardError || !flashcard) {
    console.error('[convertArtifactToFlashcard] Failed:', flashcardError);
    throw new Error('Failed to create flashcard');
  }

  // Update artifact
  await (supabase as any)
    .from('learning_artifacts')
    .update({ converted_to_flashcard_id: flashcard.id })
    .eq('id', artifactId);

  console.log(`[convertArtifactToFlashcard] Converted ${artifact.type} artifact to flashcard`);
  return { flashcardId: flashcard.id };
}

// ============================================================================
// DELETE ARTIFACT
// ============================================================================

/**
 * Delete an artifact.
 */
export async function deleteArtifact(artifactId: string): Promise<void> {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Authentication required');
  }

  const { error } = await (supabase as any)
    .from('learning_artifacts')
    .delete()
    .eq('id', artifactId)
    .eq('user_id', user.id);

  if (error) {
    console.error('[deleteArtifact] Failed:', error);
    throw new Error('Failed to delete artifact');
  }
}

/**
 * Delete all artifacts for a specific video.
 */
export async function deleteArtifactsByContentId(videoId: string): Promise<void> {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Authentication required');
  }

  const { error } = await (supabase as any)
    .from('learning_artifacts')
    .delete()
    .eq('content_id', videoId)
    .eq('user_id', user.id);

  if (error) {
    console.error('[deleteArtifactsByContentId] Failed:', error);
    throw new Error('Failed to delete artifacts');
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function sanitizeText(text: string, maxLength: number): string {
  let sanitized = text.trim();
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  return sanitized;
}

function mapDbToArtifact(row: DbArtifactRow): LearningArtifact {
  return {
    id: row.id,
    userId: row.user_id,
    contentId: row.content_id,
    checkpointId: row.checkpoint_id,
    type: row.type as 'prediction' | 'explanation' | 'one_sentence_rule' | 'snapshot',
    userText: row.user_text,
    followUpText: row.follow_up_text,
    promptUsed: row.prompt_used,
    requiredKeyword: row.required_keyword,
    maxWords: row.max_words,
    targetAudience: row.target_audience,
    conceptName: row.concept_name,
    revealTimestampSeconds: row.reveal_timestamp_seconds,
    timestampSeconds: row.timestamp_seconds,
    convertedToFlashcardId: row.converted_to_flashcard_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
