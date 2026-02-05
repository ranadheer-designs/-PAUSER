/**
 * POST /api/checkpoints/:checkpointId/complete - Mark checkpoint as complete
 * 
 * Records user completion, updates skill progression, and schedules spaced repetition.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { authenticateRequest } from '@/utils/apiAuth';
import { AdaptiveLearningEngine, CheckpointCompletion } from '@/services/adaptiveLearningEngine';
import { SpacedRepetitionEngine } from '@/services/spacedRepetitionEngine';

interface CompleteRequest {
  response?: any;
  timeSpent?: number;
  testResults?: any;
  hintsUsed?: number;
  difficultyRating?: number;
  wasHelpful?: boolean;
}

interface RouteContext {
  params: Promise<{ checkpointId: string }>;
}

export async function POST(
  req: Request,
  context: RouteContext
) {
  try {
    // Authenticate
    const { user, error: authError } = await authenticateRequest();
    if (authError) return authError;
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { checkpointId } = await context.params;
    
    if (!checkpointId) {
      return NextResponse.json(
        { error: 'checkpointId is required' },
        { status: 400 }
      );
    }
    
    const body: CompleteRequest = await req.json();
    const {
      response,
      timeSpent = 0,
      testResults,
      hintsUsed = 0,
      difficultyRating,
      wasHelpful,
    } = body;
    
    const supabase = createClient();
    
    // Verify checkpoint exists and get its details
    const { data: checkpoint, error: cpError } = await supabase
      .from('checkpoints')
      .select('*, video:videos(youtube_id, title)')
      .eq('id', checkpointId)
      .single();
    
    if (cpError || !checkpoint) {
      return NextResponse.json(
        { error: 'Checkpoint not found' },
        { status: 404 }
      );
    }
    
    // Upsert completion record
    const completionData = {
      user_id: user.id,
      checkpoint_id: checkpointId,
      completed_at: new Date().toISOString(),
      time_spent: timeSpent,
      user_response: response ? JSON.stringify(response) : null,
      test_results: testResults ? JSON.stringify(testResults) : null,
      hints_used: hintsUsed,
      difficulty_rating: difficultyRating,
      was_helpful: wasHelpful,
    };
    
    const { data: completion, error: insertError } = await (supabase
      .from('checkpoint_completions') as any)
      .upsert(completionData, {
        onConflict: 'user_id,checkpoint_id',
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('[API/checkpoints/complete] Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save completion' },
        { status: 500 }
      );
    }
    
    // Extract topic from checkpoint metadata
    const topic = (checkpoint as any).metadata?.topic || 
                  (checkpoint as any).embedded_config?.topic ||
                  'general';
    
    // Update skill progression via AdaptiveLearningEngine
    try {
      const adaptiveCompletion: CheckpointCompletion = {
        checkpointId,
        metadata: {
          topic,
          type: (checkpoint as any).type,
          difficulty: (checkpoint as any).difficulty,
        },
        score: wasHelpful ? 1 : (difficultyRating ? difficultyRating / 5 : 0.7),
        timeTaken: timeSpent,
        hintsUsed,
      };
      
      await AdaptiveLearningEngine.updateUserProfile(user.id, adaptiveCompletion);
    } catch (adaptiveError) {
      console.error('[API/checkpoints/complete] Adaptive learning error:', adaptiveError);
      // Continue even if adaptive update fails
    }
    
    // Schedule spaced repetition review
    try {
      // Convert to SM-2 rating (0-5)
      // wasHelpful=true or high rating -> 4-5
      // wasHelpful=false or low rating -> 0-2
      const sm2Rating = wasHelpful 
        ? (hintsUsed === 0 ? 5 : 4)
        : (difficultyRating ? Math.min(difficultyRating, 3) : 2);
      
      await SpacedRepetitionEngine.scheduleReview(user.id, checkpointId, sm2Rating);
    } catch (srsError) {
      console.error('[API/checkpoints/complete] SRS scheduling error:', srsError);
      // Continue even if SRS fails
    }
    
    // Update checkpoint analytics
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Try to update existing analytics
      const { error: analyticsError } = await (supabase.rpc as any)('increment_checkpoint_completions', {
        p_checkpoint_id: checkpointId,
        p_date: today,
        p_time_spent: timeSpent,
        p_difficulty: difficultyRating || 3,
      });
      
      if (analyticsError) {
        // Fallback: upsert directly if RPC doesn't exist
        await (supabase
          .from('checkpoint_analytics') as any)
          .upsert({
            checkpoint_id: checkpointId,
            created_at: today,
            completions: 1,
            avg_time_spent: timeSpent,
            avg_difficulty_rating: difficultyRating || 3,
          }, {
            onConflict: 'checkpoint_id,created_at',
          });
      }
    } catch (analyticsError) {
      console.error('[API/checkpoints/complete] Analytics error:', analyticsError);
      // Continue even if analytics fails
    }
    
    return NextResponse.json({
      success: true,
      completion: {
        id: (completion as any).id,
        checkpointId,
        completedAt: (completion as any).completed_at,
        timeSpent,
        hintsUsed,
      },
      message: 'Checkpoint marked as complete',
    });
    
  } catch (error) {
    console.error('[API/checkpoints/complete] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
