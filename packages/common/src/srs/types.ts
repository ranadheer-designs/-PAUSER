/**
 * Type definitions for the SM-2 Spaced Repetition Algorithm.
 */

/**
 * Valid review grades (0-5) as per SM-2 algorithm.
 * 
 * 0: Complete blackout.
 * 1: Incorrect response; the correct one remembered.
 * 2: Incorrect response; where the correct one seemed easy to recall.
 * 3: Correct response recalled with serious difficulty.
 * 4: Correct response after a hesitation.
 * 5: Perfect recall.
 */
export type ReviewGrade = 0 | 1 | 2 | 3 | 4 | 5;

/** 
 * State of a flashcard for SM-2 scheduling.
 * 
 * These fields map directly to the `reviews` table in the database.
 */
export interface SM2Card {
  /** The Easiness Factor (EF). Minimum 1.3, Default 2.5. */
  easeFactor: number;
  
  /** Current interval in days. */
  interval: number;
  
  /** Number of consecutive successful repetitions. */
  repetitions: number;
}

/**
 * Result of calculating a new schedule.
 */
export interface SM2Schedule {
  /** The updated card state */
  card: SM2Card;
  
  /** The calculated due date */
  dueDate: Date;
}
