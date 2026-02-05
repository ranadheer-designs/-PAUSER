/**
 * GET /api/users/:userId/dashboard - Learning dashboard data
 * 
 * Returns aggregated learning statistics, skill progression,
 * upcoming reviews, and video recommendations.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { authenticateRequest, canAccessUserResource } from '@/utils/apiAuth';
import { UserService } from '@/services/userService';
import { SpacedRepetitionEngine } from '@/services/spacedRepetitionEngine';

interface RouteContext {
  params: Promise<{ userId: string }>;
}

export async function GET(
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
    
    const { userId } = await context.params;
    
    // Verify user can access this dashboard
    if (!canAccessUserResource(user.id, userId)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    const supabase = createClient();
    
    // Fetch all dashboard data in parallel
    const [
      userStats,
      skillProgression,
      upcomingReviews,
      recentActivity,
      recommendations,
    ] = await Promise.all([
      getUserStats(supabase, userId),
      getSkillProgression(supabase, userId),
      SpacedRepetitionEngine.getUpcomingReviews(userId),
      getRecentActivity(supabase, userId),
      getRecommendedVideos(supabase, userId),
    ]);
    
    return NextResponse.json({
      stats: userStats,
      skillProgression,
      upcomingReviews,
      recentActivity,
      recommendations,
    });
    
  } catch (error) {
    console.error('[API/users/dashboard] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get aggregated user statistics
 */
async function getUserStats(supabase: any, userId: string) {
  // Count total completions
  const { count: totalCompletions } = await supabase
    .from('checkpoint_completions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  // Count unique videos with completions
  const { data: videoCompletions } = await supabase
    .from('checkpoint_completions')
    .select('checkpoint:checkpoints(video_id)')
    .eq('user_id', userId);
  
  const uniqueVideoIds = new Set(
    (videoCompletions || [])
      .map((c: any) => c.checkpoint?.video_id)
      .filter(Boolean)
  );
  
  // Get total time spent
  const { data: timeData } = await supabase
    .from('checkpoint_completions')
    .select('time_spent')
    .eq('user_id', userId);
  
  const totalTimeSpent = (timeData || []).reduce(
    (sum: number, c: any) => sum + (c.time_spent || 0),
    0
  );
  
  // Get streak (consecutive days with completions)
  const streak = await calculateStreak(supabase, userId);
  
  // Get topic counts
  const { data: skillData } = await supabase
    .from('user_skill_progression')
    .select('topic')
    .eq('user_id', userId);
  
  return {
    totalCheckpointsCompleted: totalCompletions || 0,
    uniqueVideosWatched: uniqueVideoIds.size,
    totalTimeSpentSeconds: totalTimeSpent,
    totalTimeSpentMinutes: Math.round(totalTimeSpent / 60),
    currentStreak: streak,
    topicsStudied: (skillData || []).length,
  };
}

/**
 * Calculate learning streak (consecutive days)
 */
async function calculateStreak(supabase: any, userId: string): Promise<number> {
  const { data: completions } = await supabase
    .from('checkpoint_completions')
    .select('completed_at')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(100);
  
  if (!completions || completions.length === 0) return 0;
  
  const dates = completions.map((c: any) => 
    new Date(c.completed_at).toISOString().split('T')[0]
  );
  const uniqueDates = [...new Set(dates)].sort().reverse();
  
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  // Start from today or yesterday
  let currentDate = uniqueDates[0] === today || uniqueDates[0] === yesterday 
    ? new Date(uniqueDates[0]) 
    : null;
  
  if (!currentDate) return 0;
  
  for (const dateStr of uniqueDates) {
    const checkDate = currentDate.toISOString().split('T')[0];
    if (dateStr === checkDate) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
}

/**
 * Get skill progression data
 */
async function getSkillProgression(supabase: any, userId: string) {
  const { data: progression } = await supabase
    .from('user_skill_progression')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  
  return (progression || []).map((p: any) => ({
    topic: p.topic,
    skillLevel: p.skill_level,
    checkpointsCompleted: p.checkpoints_completed,
    lastPracticed: p.last_practiced,
  }));
}

/**
 * Get recent learning activity
 */
async function getRecentActivity(supabase: any, userId: string) {
  const { data: completions } = await supabase
    .from('checkpoint_completions')
    .select(`
      id,
      completed_at,
      time_spent,
      was_helpful,
      checkpoint:checkpoints(
        title,
        type,
        video:videos(title, youtube_id)
      )
    `)
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(10);
  
  return (completions || []).map((c: any) => ({
    id: c.id,
    completedAt: c.completed_at,
    timeSpent: c.time_spent,
    wasHelpful: c.was_helpful,
    checkpointTitle: c.checkpoint?.title,
    checkpointType: c.checkpoint?.type,
    videoTitle: c.checkpoint?.video?.title,
    videoId: c.checkpoint?.video?.youtube_id,
    thumbnailUrl: c.checkpoint?.video?.youtube_id 
      ? `https://img.youtube.com/vi/${c.checkpoint.video.youtube_id}/default.jpg`
      : null,
  }));
}

/**
 * Get recommended videos based on user's skill level and interests
 */
async function getRecommendedVideos(supabase: any, userId: string) {
  // Get user's skill topics
  const { data: skillData } = await supabase
    .from('user_skill_progression')
    .select('topic, skill_level')
    .eq('user_id', userId);
  
  const userTopics = (skillData || []).map((s: any) => s.topic);
  
  // Get videos the user hasn't completed checkpoints for
  const { data: completedVideos } = await supabase
    .from('checkpoint_completions')
    .select('checkpoint:checkpoints(video_id)')
    .eq('user_id', userId);
  
  const completedVideoIds = new Set(
    (completedVideos || [])
      .map((c: any) => c.checkpoint?.video_id)
      .filter(Boolean)
  );
  
  // Get all videos with checkpoints
  const { data: allVideos } = await supabase
    .from('videos')
    .select(`
      id,
      youtube_id,
      title,
      duration,
      channel_name,
      checkpoints(count)
    `)
    .order('created_at', { ascending: false })
    .limit(20);
  
  // Filter and score videos
  const recommendations = (allVideos || [])
    .filter((v: any) => !completedVideoIds.has(v.id))
    .filter((v: any) => (v.checkpoints?.[0]?.count || 0) > 0)
    .slice(0, 5)
    .map((v: any) => ({
      id: v.id,
      youtubeId: v.youtube_id,
      title: v.title,
      duration: v.duration,
      channelName: v.channel_name,
      thumbnailUrl: `https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`,
      checkpointCount: v.checkpoints?.[0]?.count || 0,
      reason: 'Continue learning',
    }));
  
  return recommendations;
}
