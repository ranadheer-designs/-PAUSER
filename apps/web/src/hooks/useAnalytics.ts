/**
 * Analytics Hooks
 * 
 * Fetches user stats for the dashboard including:
 * - Current Streak (with 48-hour forgiveness window)
 * - Focus Points (gamification metric)
 * - Focus Time (total time spent on checkpoints)
 * - Checkpoints Completed
 * - Success Rate
 */
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';

export interface UserStats {
  streak: number;
  focusPoints: number;
  totalTimeMinutes: number;
  checkpointsCompleted: number;
  checkpointsCompletedToday: number;
  successRate: number;
  loading: boolean;
  activityLog: Record<string, number>; // date string -> count
}

/**
 * Calculate streak with 48-hour forgiveness window
 * Returns the number of consecutive days with activity
 */
function calculateStreakWithForgiveness(activityDates: Date[]): number {
  if (activityDates.length === 0) return 0;
  
  // Sort dates in descending order (most recent first)
  const sortedDates = [...activityDates]
    .map(d => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());
  
  // Get unique dates (by day)
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
  
  // Check if there's recent activity (within 48-hour window)
  const mostRecentDay = uniqueDayArray[0];
  if (mostRecentDay !== today && mostRecentDay !== yesterday && mostRecentDay < twoDaysAgo) {
    return 0; // Streak broken - no activity within 48 hours
  }
  
  // Count consecutive days
  let streak = 1;
  for (let i = 0; i < uniqueDayArray.length - 1; i++) {
    const currentDay = new Date(uniqueDayArray[i]);
    const nextDay = new Date(uniqueDayArray[i + 1]);
    const diffDays = Math.floor((currentDay.getTime() - nextDay.getTime()) / (24 * 60 * 60 * 1000));
    
    // Allow 1-2 days gap (48-hour forgiveness)
    if (diffDays <= 2) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

/**
 * Calculate Focus Points using formula:
 * (correctAnswers × 10) + (streakDays × 5) + (checkpointsCompleted × 2)
 */
function calculateFocusPoints(correctAnswers: number, streakDays: number, checkpointsCompleted: number): number {
  return (correctAnswers * 10) + (streakDays * 5) + (checkpointsCompleted * 2);
}

export function useAnalytics() {
  const [stats, setStats] = useState<UserStats>({
    streak: 0,
    focusPoints: 0,
    totalTimeMinutes: 0,
    checkpointsCompleted: 0,
    checkpointsCompletedToday: 0,
    successRate: 0,
    loading: true,
    activityLog: {},
  });

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setStats(s => ({ ...s, loading: false }));
        return;
      }

      // Fetch user's attempts with timestamp for streak calculation
      const { data: attempts } = await (supabase.from('attempts') as any)
        .select('time_spent_ms, is_correct, created_at')
        .eq('user_id', user.id);
      
      const attemptList = attempts || [];
      
      // Calculate metrics
      const totalMs = attemptList.reduce((acc: number, curr: any) => acc + (curr.time_spent_ms || 0), 0);
      const checkpointsCompleted = attemptList.length;

      const today = new Date().toISOString().split('T')[0];
      const checkpointsCompletedToday = attemptList.filter((a: any) => 
        new Date(a.created_at).toISOString().split('T')[0] === today
      ).length;
      const correctAnswers = attemptList.filter((a: any) => a.is_correct).length;
      const successRate = checkpointsCompleted > 0 
        ? Math.round((correctAnswers / checkpointsCompleted) * 100) 
        : 0;
      
      // Calculate streak from activity dates (48-hour forgiveness)
      const activityDates = attemptList.map((a: any) => new Date(a.created_at));
      const streak = calculateStreakWithForgiveness(activityDates);
      
      // Calculate Focus Points
      const focusPoints = calculateFocusPoints(correctAnswers, streak, checkpointsCompleted);

      // Build activity log (last 6 months)
      const activityLog: Record<string, number> = {};
      attemptList.forEach((a: any) => {
        const date = new Date(a.created_at).toISOString().split('T')[0];
        activityLog[date] = (activityLog[date] || 0) + 1;
      });

      setStats({
        streak,
        focusPoints,
        totalTimeMinutes: Math.round(totalMs / 1000 / 60),
        checkpointsCompleted,
        checkpointsCompletedToday,
        successRate,
        loading: false,
        activityLog,
      });
    }

    fetchStats();
  }, []);

  return stats;
}
