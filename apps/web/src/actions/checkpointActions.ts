'use server';

/**
 * Checkpoint Actions (Phase 6 Schema)
 * 
 * Supabase CRUD operations for checkpoints using the new 'videos' and 'checkpoints' tables.
 * 
 * UPDATE: Uses Service Role key (if available) for write operations to ensure
 * reliability regardless of RLS policies for authenticated users.
 */

import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

interface VideoRecord {
  id: string;
  youtube_id: string;
}

interface NewCheckpointRecord {
  id: string;
  video_id: string;
  timestamp: number;
  type: string;
  title: string;
  embedded_config: any;
  metadata: any;
  ai_generated: boolean;
  created_at: string;
}

/** Prediction Before Reveal content */
interface PredictionContent {
  type: 'prediction';
  prompt: string;
  context: string;
  revealTimestamp: number;
}

/** Explain It Back content */
interface ExplanationContent {
  type: 'explanation';
  prompt: string;
  conceptName: string;
  targetAudience: 'junior' | 'past_self' | 'friend';
}

/** One-Sentence Rule content */
interface OneSentenceRuleContent {
  type: 'one_sentence_rule';
  conceptName: string;
  requiredKeyword: string;
  maxWords: number;
}

interface SnapshotContent {
  type: 'snapshot';
  prompt: string;
  context: string;
}

/** Practice Resource content */
interface PracticeResourceContent {
  type: 'practice_resource';
  platform: 'leetcode' | 'hackerrank' | 'codewars';
  problemId: string;
  title: string;
  url: string;
  difficulty: 'easy' | 'medium' | 'hard';
  matchConfidence: number;
  matchReason: string;
}

/** Code Practice content */
interface CodePracticeContent {
  type: 'code_practice';
  language: string;
  starterCode: string;
  testCases: Array<{ input: unknown; expected: unknown; description?: string }>;
  hints: string[];
  solution: string;
  problem: string;
}

/** Concept Quiz content */
interface ConceptQuizContent {
  type: 'concept_quiz';
  question: string;
  options: Array<{ id: string; text: string; isCorrect: boolean }>;
  explanation: string;
}

type CheckpointContent = PredictionContent | ExplanationContent | OneSentenceRuleContent | SnapshotContent | PracticeResourceContent | CodePracticeContent | ConceptQuizContent;

export interface Checkpoint {
  id: string;
  timestamp: number;
  type: 'prediction' | 'explanation' | 'one_sentence_rule' | 'snapshot' | 'practice_resource' | 'code_practice' | 'concept_quiz';
  title: string;
  completed: boolean;
  content?: CheckpointContent;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Create a Supabase client with Service Role privileges if keys are available.
 * Falls back to null if keys are missing.
 */
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (supabaseUrl && serviceKey) {
    return createSupabaseClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return null;
}

/**
 * Get the best available Supabase client for Write operations.
 * Prioritizes Admin client to bypass RLS, falls back to User client.
 */
function getWriteClient() {
  const admin = createAdminClient();
  if (admin) return admin;
  return createClient(); // Fallback to user session client
}

/**
 * Get or create 'videos' record.
 */
export async function getOrCreateVideoId(
  videoId: string,
  metadata?: { title?: string; description?: string; thumbnailUrl?: string }
): Promise<string> {
  const supabase = getWriteClient();
  
  // Get current user for scoping
  const authClient = createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) throw new Error('Authentication required to manage videos');
  
  // Try finding existing video for THIS user
  const { data: existingVideo } = await supabase
    .from('videos')
    .select('id')
    .eq('youtube_id', videoId)
    .eq('user_id', user.id)
    .maybeSingle();
  
  if (existingVideo) {
    // Optional: Update metadata if provided
    if (metadata?.title) {
        await (supabase
            .from('videos') as any)
            .update({
                title: metadata.title,
                description: metadata.description || null,
            })
            .eq('id', (existingVideo as any).id);
    }
    return (existingVideo as any).id;
  }
  
  // Insert new video scoped to this user
    const { data: newVideo, error } = await (supabase
    .from('videos') as any)
    .insert({
      youtube_id: videoId,
      user_id: user.id,
      title: metadata?.title || `Video ${videoId}`,
      description: metadata?.description || null,
      duration: 0
    })
    .select('id')
    .single();
  
  if (error) {
    console.error('[getOrCreateVideoId] Failed to create video:', error);
    throw error;
  }
  
  return (newVideo as any).id;
}

export async function updateVideoMetadata(
  videoId: string, 
  metadata: { title: string; description?: string; thumbnailUrl?: string }
): Promise<void> {
    await getOrCreateVideoId(videoId, metadata);
}

// ============================================================================
// GET CHECKPOINTS
// ============================================================================

export async function getCheckpointsByVideoId(videoId: string): Promise<Checkpoint[]> {
  const supabase = createClient(); // Use standard client for reads (RLS will scope to user)
  
  // Find video ID for current user (RLS ensures only own videos are visible)
  const { data: video } = await supabase
    .from('videos')
    .select('id')
    .eq('youtube_id', videoId)
    .maybeSingle();
  
  if (!video) return [];
  
  // Fetch checkpoints (RLS ensures only checkpoints for own videos)
  const { data: checkpoints, error } = await supabase
    .from('checkpoints')
    .select('*')
    .eq('video_id', (video as any).id)
    .order('timestamp', { ascending: true });
  
  if (error) {
    console.error('[getCheckpointsByVideoId] Failed to fetch checkpoints:', error);
    throw error;
  }
  
  return (checkpoints || []).map((cp: any) => {
    const checkpointContent = reconstructContent(cp);
    
    return {
      id: cp.id,
      timestamp: cp.timestamp,
      type: cp.type as any,
      title: cp.title,
      completed: false,
      content: checkpointContent,
    };
  });
}

/**
 * Reconstruct content from embedded_config
 */
function reconstructContent(cp: any): CheckpointContent | undefined {
  const config = cp.embedded_config || {};
  
  // Map back to CheckpointContent types based on 'type' column
  switch (cp.type) {
    case 'prediction':
      return {
        type: 'prediction',
        prompt: config.prompt || cp.title,
        context: config.context || '',
        revealTimestamp: config.revealTimestamp || cp.timestamp + 30,
      };
    
    case 'explanation':
      return {
        type: 'explanation',
        prompt: config.prompt || cp.title,
        conceptName: config.conceptName || '',
        targetAudience: config.targetAudience || 'junior',
      };
      
    case 'one_sentence_rule':
      return {
        type: 'one_sentence_rule',
        conceptName: config.conceptName || '',
        requiredKeyword: config.requiredKeyword || '',
        maxWords: config.maxWords || 15
      };

    case 'snapshot':
      return {
        type: 'snapshot',
        prompt: config.prompt || cp.title,
        context: config.context || ''
      };
      
    case 'practice_resource':
      return {
        type: 'practice_resource',
        platform: config.platform || 'leetcode',
        problemId: config.problemId || '',
        title: config.title || cp.title,
        url: config.url || '',
        difficulty: config.difficulty || 'medium',
        matchConfidence: config.matchConfidence || 0,
        matchReason: config.matchReason || ''
      };

    case 'code_practice': 
      return {
        type: 'code_practice',
        language: config.language || 'javascript',
        starterCode: config.starterCode || '',
        testCases: config.testCases || [],
        hints: config.hints || [],
        solution: config.solution || '',
        problem: config.problem || cp.title,
      };

    case 'concept_quiz':
      return {
        type: 'concept_quiz',
        question: config.question || cp.title,
        options: config.options || [],
        explanation: config.explanation || '',
      };
      
      
    default:
      return undefined;
  }
}

// ============================================================================
// SAVE CHECKPOINTS
// ============================================================================

export async function saveCheckpoints(
  videoId: string,
  checkpoints: Checkpoint[],
  metadata?: { title?: string; description?: string; thumbnailUrl?: string }
): Promise<void> {
  const supabase = getWriteClient();
  const isAdmin = !!createAdminClient();
  
  console.log(`[saveCheckpoints] Saving ${checkpoints.length} checkpoints for video ${videoId} (Admin: ${isAdmin})`);
  
  try {
    const dbVideoId = await getOrCreateVideoId(videoId, metadata);
    
    // Delete existing checkpoints for this video (Phase 6 table)
    const { error: deleteError } = await supabase
      .from('checkpoints')
      .delete()
      .eq('video_id', dbVideoId);

    if (deleteError) {
        console.error('[saveCheckpoints] Error deleting old checkpoints:', deleteError);
        throw deleteError;
    }
    
    // Insert new checkpoints
    const dbCheckpoints = checkpoints.map((cp) => {
      let embedded_config: any = {};
      let type = cp.type;
      let title = cp.title;

      // Populate embedded_config based on content
      if (cp.content) {
        switch (cp.content.type) {
          case 'prediction':
            embedded_config = {
              prompt: cp.content.prompt,
              context: cp.content.context,
              revealTimestamp: cp.content.revealTimestamp
            };
            break;
          case 'explanation':
            embedded_config = {
                prompt: cp.content.prompt,
                conceptName: cp.content.conceptName,
                targetAudience: cp.content.targetAudience
            };
            break;
          case 'one_sentence_rule':
            embedded_config = {
                conceptName: cp.content.conceptName,
                requiredKeyword: cp.content.requiredKeyword,
                maxWords: cp.content.maxWords
            };
            title = `Describe ${cp.content.conceptName}`;
            break;
          case 'snapshot':
            embedded_config = {
                prompt: cp.content.prompt,
                context: cp.content.context
            };
            break;
          case 'practice_resource':
            embedded_config = {
                platform: cp.content.platform,
                problemId: cp.content.problemId,
                title: cp.content.title,
                url: cp.content.url,
                difficulty: cp.content.difficulty,
                matchConfidence: cp.content.matchConfidence,
                matchReason: cp.content.matchReason
            };
            break;
          case 'code_practice': 
            embedded_config = {
              language: cp.content.language,
              starterCode: cp.content.starterCode,
              testCases: cp.content.testCases,
              hints: cp.content.hints,
              solution: cp.content.solution,
              problem: cp.content.problem,
            };
            break;
          case 'concept_quiz':
             embedded_config = {
                question: cp.content.question,
                options: cp.content.options,
                explanation: cp.content.explanation
             };
             break;
        }
      }

      return {
        video_id: dbVideoId,
        timestamp: Math.round(cp.timestamp),
        type: type,
        title: title,
        embedded_config: embedded_config,
        metadata: {},
        ai_confidence: 1.0, 
        created_at: new Date().toISOString()
      };
    });  
  
    if (dbCheckpoints.length > 0) {
      const { error } = await (supabase
        .from('checkpoints') as any)
        .insert(dbCheckpoints);
      
      if (error) {
        console.error('[saveCheckpoints] Failed to save checkpoints:', error);
        throw error;
      }
    }
    
    console.log(`[saveCheckpoints] Successfully saved. Check your 'videos' table for id: ${dbVideoId}`);
  } catch (err: any) {
    console.error('[saveCheckpoints] CRITICAL FAILURE:', err.message || err);
    throw err;
  }
}

export async function hasCheckpoints(videoId: string): Promise<boolean> {
  const checkpoints = await getCheckpointsByVideoId(videoId);
  return checkpoints.length > 0;
}

export async function getContentIdByVideoId(videoId: string): Promise<string | null> {
    // Backward compatibility helper - returns the video ID (RLS scopes to current user)
    const supabase = createClient();
    const { data } = await supabase.from('videos').select('id').eq('youtube_id', videoId).maybeSingle();
    return data ? (data as any).id : null;
}

export async function deleteVideoContent(contentId: string): Promise<{ success: boolean; error?: string }> {
  // Use write client (admin if available) for delete
  const supabase = getWriteClient();
  
  // We STILL verify the user is logged in using the auth client
  const authClient = createClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }
  
  // Delete checkpoints first (cascade should handle this, but let's be explicit)
  const { error: checkpointsError } = await supabase
    .from('checkpoints')
    .delete()
    .eq('video_id', contentId);
  
  if (checkpointsError) {
    console.error('[deleteVideoContent] Failed to delete checkpoints:', checkpointsError);
    // Continue anyway
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
