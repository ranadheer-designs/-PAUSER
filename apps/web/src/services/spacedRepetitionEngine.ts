import { createClient } from '@/utils/supabase/server';
import { Checkpoint } from '../actions/checkpointActions'; // Assuming type is exported

export interface ReviewCard {
  checkpointId: string;
  topic: string;
  nextReview: Date;
  interval: number; // days
  easeFactor: number;
  repetitions: number;
}

export class SpacedRepetitionEngine {
  /**
   * Schedule a review for a completed checkpoint using SM-2 algorithm.
   */
  /**
   * Schedule a review for a completed checkpoint using SM-2 algorithm.
   */
  static async scheduleReview(
    userId: string, 
    checkpointId: string, 
    performanceRating: number // 0-5
  ) {
    const supabase = createClient();
    
    // 1. Fetch existing review card (if any)
    const { data: existingCardRaw } = await supabase
      .from('review_cards')
      .select('*')
      .eq('user_id', userId)
      .eq('checkpoint_id', checkpointId) 
      .maybeSingle();
      
    const existingCard = existingCardRaw as any;

    let easeFactor = 2.5;
    let interval = 0;
    let repetitions = 0;

    if (existingCard) {
      easeFactor = existingCard.ease_factor;
      interval = existingCard.interval_days;
      repetitions = existingCard.repetitions;
    }

    // 2. Apply SM-2 Algorithm
    if (performanceRating >= 3) {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions += 1;
    } else {
      repetitions = 0;
      interval = 1;
    }

    easeFactor = easeFactor + (0.1 - (5 - performanceRating) * (0.08 + (5 - performanceRating) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    // 3. Save to database (review_cards)
    if (existingCard) {
       await (supabase.from('review_cards') as any).update({
         ease_factor: easeFactor,
         interval_days: interval,
         repetitions: repetitions,
         next_review: nextReviewDate.toISOString().split('T')[0] // DATE column
       } as any).eq('id', existingCard.id);
    } else {
       await (supabase.from('review_cards') as any).insert({
         user_id: userId,
         checkpoint_id: checkpointId,
         ease_factor: easeFactor,
         interval_days: interval,
         repetitions: repetitions,
         next_review: nextReviewDate.toISOString().split('T')[0] // DATE column
       } as any);
    }
  }

  /**
   * Get pending reviews for the user.
   */
  static async getUpcomingReviews(userId: string): Promise<any[]> {
    const supabase = createClient();
    const now = new Date().toISOString().split('T')[0]; // Compare DATE

    // review_cards -> checkpoint -> videos
    const { data: reviewsRaw } = await supabase
      .from('review_cards')
      .select(`
        *,
        checkpoint:checkpoints (
          *,
          video:videos (title, youtube_id)
        )
      `)
      .eq('user_id', userId)
      .lte('next_review', now)
      .order('next_review', { ascending: true })
      .limit(10);
      
    const reviews = (reviewsRaw || []) as any[];

    // Transform into a structure consumable by the frontend
    return reviews.map(r => ({
      type: 'REVIEW',
      title: `Review: ${r.checkpoint?.title || 'Concept'}`,
      checkpoint: r.checkpoint,
      originalVideoId: r.checkpoint?.video?.youtube_id,
      dueDate: r.next_review
    }));
  }

  /**
   * Check if we should inject a review into the current session.
   */
  static async injectReviewCheckpoint(userId: string, currentVideoTime: number): Promise<any | null> {
    // Simple logic: If we are at a "break" (e.g. video paused or specific timestamp modulo)
    // and there are pending reviews.
    
    // For now, let's just purely check availability. 
    // Real "moment" logic would depend on video analysis structure (is this a chapter break?).
    
    const reviews = await this.getUpcomingReviews(userId);
    if (reviews.length > 0) {
      return reviews[0];
    }
    
    return null;
  }
}
