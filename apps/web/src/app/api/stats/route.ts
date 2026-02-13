import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * API endpoint for fetching user analytics stats
 * Used by the Chrome extension popup to display streak and cards due
 */

// Calculate streak with 48-hour forgiveness window
function calculateStreakWithForgiveness(activityDates: Date[]): number {
  if (activityDates.length === 0) return 0;
  
  const sortedDates = [...activityDates]
    .map(d => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());
  
  const uniqueDays = new Set<string>();
  sortedDates.forEach(date => {
    uniqueDays.add(date.toISOString().split('T')[0]);
  });
  
  const uniqueDayArray = Array.from(uniqueDays).sort().reverse();
  
  if (uniqueDayArray.length === 0) return 0;
  
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const mostRecentDay = uniqueDayArray[0];
  if (mostRecentDay !== today && mostRecentDay !== yesterday && mostRecentDay < twoDaysAgo) {
    return 0;
  }
  
  let streak = 1;
  for (let i = 0; i < uniqueDayArray.length - 1; i++) {
    const currentDay = new Date(uniqueDayArray[i]);
    const nextDay = new Date(uniqueDayArray[i + 1]);
    const diffDays = Math.floor((currentDay.getTime() - nextDay.getTime()) / (24 * 60 * 60 * 1000));
    
    if (diffDays <= 2) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ 
        streak: 0, 
        dueCards: 0,
        focusPoints: 0,
        authenticated: false 
      });
    }

    // Fetch user's attempts (completions) for streak calculation
    const { data: attempts } = await (supabase.from('checkpoint_completions') as any)
      .select('time_spent, was_helpful, completed_at')
      .eq('user_id', user.id);
    
    const attemptList = attempts || [];
    
    // Calculate streak
    const activityDates = attemptList.map((a: any) => new Date(a.completed_at));
    const streak = calculateStreakWithForgiveness(activityDates);
    
    // Calculate focus points
    // New schema uses was_helpful boolean instead of is_correct
    const correctAnswers = attemptList.filter((a: any) => a.was_helpful).length;
    const checkpointsCompleted = attemptList.length;
    const focusPoints = (correctAnswers * 10) + (streak * 5) + (checkpointsCompleted * 2);
    
    // Fetch due flashcards (cards due for review)
    const now = new Date().toISOString().split('T')[0];
    const { data: dueReviews } = await (supabase.from('review_cards') as any)
      .select('id')
      .eq('user_id', user.id)
      .lte('next_review', now);
    
    const dueCards = dueReviews?.length || 0;

    return NextResponse.json({
      streak,
      dueCards,
      focusPoints,
      authenticated: true
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ 
      streak: 0, 
      dueCards: 0,
      focusPoints: 0,
      authenticated: false,
      error: 'Failed to fetch stats'
    }, { status: 500 });
  }
}
