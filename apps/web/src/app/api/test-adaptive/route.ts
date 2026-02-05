import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AdaptiveLearningEngine } from '@/services/adaptiveLearningEngine';
import { SpacedRepetitionEngine } from '@/services/spacedRepetitionEngine';
import { UserService } from '@/services/userService';

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const results: any[] = [];

  // 1. Test UserService
  const profile = await UserService.getUserProfile(user.id);
  results.push({ step: 'GetUserProfile', success: !!profile, data: profile });

  // 2. Test AdaptiveLearningEngine
  if (profile) {
    await AdaptiveLearningEngine.updateUserProfile(user.id, {
      checkpointId: 'test-checkpoint-1', // Mock ID
      metadata: { topic: 'react-hooks' },
      score: 1.0, // Perfect score
      timeTaken: 30,
      hintsUsed: 0
    });
    
    // Verify update
    const updatedProfile = await UserService.getUserProfile(user.id);
    const progression = updatedProfile?.skillProgression?.['react-hooks'];
    results.push({ 
      step: 'AdaptiveUpdate', 
      success: progression === 'intermediate' || progression === 'advanced', 
      detail: `Skill progression: ${progression}` 
    });
  }

  // 3. Test SpacedRepetitionEngine
  const mockCheckpointId = '00000000-0000-0000-0000-000000000000'; // Need a valid UUID usually, but let's see if we can get away with a real one
  // We need a real checkpoint ID to avoid FK errors ideally, but maybe we can just insert a mock one if needed.
  // Actually, let's try to find an existing checkpoint or content first.
  
  // For now, let's skip the actual DB insert call for SRS if we don't have constraints met, OR just try it.
  // The SRS engine tries to link to 'reviews' table.
  // FK constraints might fail `checkpoint_id` if it doesn't exist.
  
  try {
     // Check for any video to piggyback on
     const { data: video } = await (supabase.from('videos') as any).select('id').limit(1).maybeSingle();
     
     if (video) {
        // Create a dummy checkpoint
        const { data: cp } = await (supabase.from('checkpoints') as any).insert({
            video_id: video.id,
            timestamp: 0,
            type: 'quiz',
            title: 'Test Checkpoint',
            embedded_config: { prompt: 'Test Prompt', answer_key: { index: 0 } },
            ai_confidence: 1.0
        }).select('id').single();

        if (cp) {
             await SpacedRepetitionEngine.scheduleReview(user.id, cp.id, 5);
             results.push({ step: 'ScheduleReview', success: true });
             
             const reviews = await SpacedRepetitionEngine.getUpcomingReviews(user.id);
             results.push({ step: 'GetReviews', count: reviews.length, reviews });
        }
     } else {
        // Try creating a video if none exists (test env)
        const { data: newVideo } = await (supabase.from('videos') as any).insert({
            youtube_id: 'test_vid_' + Date.now(),
            title: 'Test Video',
            description: 'Created by test-adaptive'
        }).select('id').single();
        
        if (newVideo) {
            const { data: cp } = await (supabase.from('checkpoints') as any).insert({
                video_id: newVideo.id,
                timestamp: 0,
                type: 'quiz',
                title: 'Test Checkpoint',
                embedded_config: { prompt: 'Test Prompt' },
                ai_confidence: 1.0
            }).select('id').single();
            
            if (cp) {
                 await SpacedRepetitionEngine.scheduleReview(user.id, cp.id, 5);
                 results.push({ step: 'ScheduleReview', success: true });
                 const reviews = await SpacedRepetitionEngine.getUpcomingReviews(user.id);
                 results.push({ step: 'GetReviews', count: reviews.length, reviews });
            }
        } else {
            results.push({ step: 'SkippedSRSTest', reason: 'No video found or created' });
        }
     }
  } catch (e: any) {
    results.push({ step: 'SRSError', error: e.message });
  }

  return NextResponse.json({ results });
}
