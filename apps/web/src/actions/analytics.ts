'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Record a user attempt on a checkpoint.
 */
export async function saveAttempt(
  checkpointId: string,
  isCorrect: boolean,
  timeSpentMs: number,
  userAnswer: any = {}
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // In a real app, maybe store locally? For now, ignore.
    return { error: 'Not authenticated' };
  }

  // Bypass strict type checking for now due to monorepo type inference issues
  const { error } = await (supabase.from('checkpoint_completions') as any).insert({
    user_id: user.id,
    checkpoint_id: checkpointId,
    was_helpful: isCorrect, // Semantic mapping mismatch but effectively 'success'
    time_spent: Math.round(timeSpentMs / 1000), // ms -> seconds
    user_response: userAnswer,
    completed_at: new Date().toISOString()
  });

  if (error) {
    console.error('Failed to save attempt:', error);
    return { error: error.message };
  }

  // Update streak logic would go here (or via database trigger)
  revalidatePath('/dashboard');
  return { success: true };
}
