/**
 * GET /api/videos/:videoId/checkpoints - Get checkpoints for a video
 * 
 * Returns checkpoints with user completion status if authenticated.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getCheckpointsByVideoId } from '@/actions/checkpointActions';
import { UserService } from '@/services/userService';

interface CheckpointWithStatus {
  id: string;
  timestamp: number;
  type: string;
  title: string;
  content: any;
  completed: boolean;
  completedAt?: string;
  userResponse?: any;
}

interface RouteContext {
  params: Promise<{ videoId: string }>;
}

export async function GET(
  req: Request,
  context: RouteContext
) {
  try {
    const { videoId } = await context.params;
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'videoId is required' },
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    
    // Get authenticated user (optional for this endpoint)
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    // Get base checkpoints
    const checkpoints = await getCheckpointsByVideoId(videoId);
    
    if (checkpoints.length === 0) {
      return NextResponse.json({
        checkpoints: [],
        videoId,
        message: 'No checkpoints found for this video',
      });
    }
    
    // If user is authenticated, get completion status
    let checkpointsWithStatus: CheckpointWithStatus[] = checkpoints.map(cp => ({
      id: cp.id,
      timestamp: cp.timestamp,
      type: cp.type,
      title: cp.title,
      content: cp.content,
      completed: cp.completed,
    }));
    
    if (userId) {
      // Get checkpoint IDs
      const checkpointIds = checkpoints.map(cp => cp.id);
      
      // Fetch completions for this user
      const { data: completions } = await supabase
        .from('checkpoint_completions')
        .select('checkpoint_id, completed_at, user_response')
        .eq('user_id', userId)
        .in('checkpoint_id', checkpointIds);
      
      // Create completion lookup
      const completionMap = new Map(
        (completions || []).map((c: any) => [c.checkpoint_id, c])
      );
      
      // Merge completion status
      checkpointsWithStatus = checkpoints.map(cp => {
        const completion = completionMap.get(cp.id) as any;
        return {
          id: cp.id,
          timestamp: cp.timestamp,
          type: cp.type,
          title: cp.title,
          content: cp.content,
          completed: !!completion,
          completedAt: completion?.completed_at,
          userResponse: completion?.user_response,
        };
      });
      
      // Get user context for adaptive suggestions
      const userProfile = await UserService.getUserProfile(userId);
      
      if (userProfile) {
        // Adapt checkpoints based on user level
        checkpointsWithStatus = adaptCheckpointsForUser(
          checkpointsWithStatus,
          userProfile
        );
      }
    }
    
    return NextResponse.json({
      checkpoints: checkpointsWithStatus,
      videoId,
      totalCount: checkpointsWithStatus.length,
      completedCount: checkpointsWithStatus.filter(c => c.completed).length,
    });
    
  } catch (error) {
    console.error('[API/videos/checkpoints] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Adapt checkpoints based on user's skill level and preferences.
 */
function adaptCheckpointsForUser(
  checkpoints: CheckpointWithStatus[],
  userProfile: any
): CheckpointWithStatus[] {
  const difficultyPreference = userProfile.difficultyPreference || 'maintain';
  
  return checkpoints.map(checkpoint => {
    // Add adaptive hints based on user level
    const adapted = { ...checkpoint };
    
    if (checkpoint.content?.type === 'practice_resource') {
      const content = checkpoint.content as any;
      
      // Add difficulty guidance
      if (difficultyPreference === 'decrease' && content.difficulty === 'hard') {
        adapted.content = {
          ...content,
          adaptiveHint: 'Consider starting with the hints if this feels challenging.',
        };
      } else if (difficultyPreference === 'increase' && content.difficulty === 'easy') {
        adapted.content = {
          ...content,
          adaptiveHint: 'Try solving this without looking at hints first!',
        };
      }
    }
    
    return adapted;
  });
}
