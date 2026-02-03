'use server';

/**
 * Checkpoint Actions
 * 
 * Supabase CRUD operations for checkpoints.
 * Handles persistence and retrieval of AI-generated cognitive checkpoints.
 * 
 * Checkpoint Types:
 * - prediction: Prediction Before Reveal
 * - explanation: Explain It Back
 * - one_sentence_rule: One-Sentence Rule
 */

import { createClient } from '@/utils/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

interface DbCheckpoint {
  id: string;
  content_id: string;
  timestamp_seconds: number;
  type: string;
  title: string | null;
  prompt: string;
  options: any | null;
  answer_key: any;
  explanation: string | null;
  difficulty: number;
  ai_generated: boolean;
  verified: boolean;
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

/** Practice Resource content (LeetCode, HackerRank, etc.) */
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

type CheckpointContent = PredictionContent | ExplanationContent | OneSentenceRuleContent | SnapshotContent | PracticeResourceContent;

export interface Checkpoint {
  id: string;
  timestamp: number;
  type: 'prediction' | 'explanation' | 'one_sentence_rule' | 'snapshot' | 'practice_resource';
  title: string;
  completed: boolean;
  content?: CheckpointContent;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get or create content record for a video.
 */
async function getOrCreateContentId(
  videoId: string,
  metadata?: { title?: string; description?: string; thumbnailUrl?: string }
): Promise<string> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: existingContent } = await supabase
    .from('contents')
    .select('id')
    .eq('external_id', videoId)
    .eq('type', 'video')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  
  if (existingContent) {
    // If metadata is provided, update the existing record
    if (metadata?.title) {
        // Cast to any to bypass strict table typing issues
        const _supabase = supabase as any;
        await _supabase
            .from('contents')
            .update({
                title: metadata.title,
                description: metadata.description || null,
                thumbnail_url: metadata.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            })
            .eq('id', (existingContent as any).id);
    }
    return (existingContent as any).id;
  }
  
  // @ts-ignore
  const { data: newContent, error } = await supabase
    .from('contents')
    .insert({
      type: 'video' as const,
      external_id: videoId,
      title: metadata?.title || `Video ${videoId}`,
      description: metadata?.description || null,
      thumbnail_url: metadata?.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      created_by: user?.id || null,
    } as any)
    .select('id')
    .single();
  
  if (error) {
    console.error('[getOrCreateContentId] Failed to create content:', error);
    throw error;
  }
  
  return (newContent as any).id;
}

/**
 * Update video metadata (title, description, etc.)
 * Useful for correcting fallback titles.
 */
export async function updateVideoMetadata(
  videoId: string, 
  metadata: { title: string; description?: string; thumbnailUrl?: string }
): Promise<void> {
    await getOrCreateContentId(videoId, metadata);
}

// ============================================================================
// GET CHECKPOINTS
// ============================================================================

/**
 * Get checkpoints for a video by YouTube ID.
 */
export async function getCheckpointsByVideoId(videoId: string): Promise<Checkpoint[]> {
  const supabase = createClient();
  
  const { data: content } = await supabase
    .from('contents')
    .select('id')
    .eq('external_id', videoId)
    .eq('type', 'video')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  
  if (!content) {
    return [];
  }
  
  const { data: checkpoints, error } = await supabase
    .from('checkpoints')
    .select('*')
    .eq('content_id', (content as any).id)
    .order('timestamp_seconds', { ascending: true });
  
  if (error) {
    console.error('[getCheckpointsByVideoId] Failed to fetch checkpoints:', error);
    throw error;
  }
  
  return (checkpoints || []).map((cp: DbCheckpoint) => {
    const checkpointContent = reconstructContent(cp);
    
    return {
      id: cp.id,
      timestamp: cp.timestamp_seconds,
      type: cp.type as 'prediction' | 'explanation' | 'one_sentence_rule' | 'snapshot' | 'practice_resource',
      title: cp.title || 'Checkpoint',
      completed: false,
      content: checkpointContent,
    };
  });
}

/**
 * Reconstruct checkpoint content from database fields.
 */
function reconstructContent(cp: DbCheckpoint): CheckpointContent | undefined {
  switch (cp.type) {
    case 'prediction':
      return {
        type: 'prediction',
        prompt: cp.prompt,
        context: cp.answer_key?.context || '',
        revealTimestamp: cp.answer_key?.revealTimestamp || cp.timestamp_seconds + 30,
      };
    
    case 'explanation':
      return {
        type: 'explanation',
        prompt: cp.prompt,
        conceptName: cp.answer_key?.conceptName || cp.title || '',
        targetAudience: cp.answer_key?.targetAudience || 'junior',
      };
    
    case 'one_sentence_rule':
      return {
        type: 'one_sentence_rule',
        conceptName: cp.answer_key?.conceptName || cp.title || '',
        requiredKeyword: cp.answer_key?.requiredKeyword || 'concept',
        maxWords: cp.answer_key?.maxWords || 15,
      };

    case 'snapshot':
      return {
        type: 'snapshot',
        prompt: cp.prompt,
        context: cp.answer_key?.context || '',
      };
    
    case 'practice_resource':
      return {
        type: 'practice_resource',
        platform: cp.answer_key?.platform || 'leetcode',
        problemId: cp.answer_key?.problemId || '',
        title: cp.title || '',
        url: cp.answer_key?.url || '',
        difficulty: cp.answer_key?.difficulty || 'medium',
        matchConfidence: cp.answer_key?.matchConfidence || 0.7,
        matchReason: cp.answer_key?.matchReason || '',
      };
    
    default:
      // Legacy checkpoint types - return undefined
      return undefined;
  }
}

// ============================================================================
// SAVE CHECKPOINTS
// ============================================================================

/**
 * Save generated checkpoints to Supabase.
 */
export async function saveCheckpoints(
  videoId: string,
  checkpoints: Checkpoint[],
  metadata?: { title?: string; description?: string; thumbnailUrl?: string }
): Promise<void> {
  const supabase = createClient();
  
  const contentId = await getOrCreateContentId(videoId, metadata);
  
  // Delete existing checkpoints (regeneration case)
  await supabase
    .from('checkpoints')
    .delete()
    .eq('content_id', contentId);
  
  // Insert new checkpoints
  const dbCheckpoints = checkpoints.map((cp) => {
    let prompt = '';
    let answerKey: any = {};
    
    if (cp.content) {
      switch (cp.content.type) {
        case 'prediction':
          prompt = cp.content.prompt;
          answerKey = {
            context: cp.content.context,
            revealTimestamp: cp.content.revealTimestamp,
          };
          break;
        
        case 'explanation':
          prompt = cp.content.prompt;
          answerKey = {
            conceptName: cp.content.conceptName,
            targetAudience: cp.content.targetAudience,
          };
          break;
        
        case 'one_sentence_rule':
          prompt = `Describe ${cp.content.conceptName} in one sentence using the word "${cp.content.requiredKeyword}"`;
          answerKey = {
            conceptName: cp.content.conceptName,
            requiredKeyword: cp.content.requiredKeyword,
            maxWords: cp.content.maxWords,
          };
          break;

        case 'snapshot':
          prompt = cp.content.prompt;
          answerKey = {
            context: cp.content.context,
          };
          break;

        case 'practice_resource':
          prompt = `Practice: ${cp.content.title}`;
          answerKey = {
            platform: cp.content.platform,
            problemId: cp.content.problemId,
            url: cp.content.url,
            difficulty: cp.content.difficulty,
            matchConfidence: cp.content.matchConfidence,
            matchReason: cp.content.matchReason,
          };
          break;
      }
    } else {
      prompt = cp.title;
    }
    
    return {
      content_id: contentId,
      timestamp_seconds: Math.round(cp.timestamp),
      type: cp.type,
      title: cp.title,
      prompt,
      options: null,
      answer_key: answerKey,
      explanation: null,
      difficulty: 1,
      ai_generated: true,
      verified: false,
    };
  });
  
  if (dbCheckpoints.length > 0) {
    const { error } = await supabase
      .from('checkpoints')
      .insert(dbCheckpoints as any);
    
    if (error) {
      console.error('[saveCheckpoints] Failed to save checkpoints:', error);
      throw error;
    }
  }
  
  console.log(`[saveCheckpoints] Saved ${dbCheckpoints.length} cognitive checkpoints for video ${videoId}`);
}

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Check if checkpoints exist for a video.
 */
export async function hasCheckpoints(videoId: string): Promise<boolean> {
  const checkpoints = await getCheckpointsByVideoId(videoId);
  return checkpoints.length > 0;
}

/**
 * Get content ID for a video (for artifact storage).
 */
export async function getContentIdByVideoId(videoId: string): Promise<string | null> {
  const supabase = createClient();
  
  const { data: content } = await supabase
    .from('contents')
    .select('id')
    .eq('external_id', videoId)
    .eq('type', 'video')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  
  return content ? (content as any).id : null;
}
