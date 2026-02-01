/**
 * Pauser Common - FSRS Types
 *
 * Type definitions for the Free Spaced Repetition Scheduler (FSRS) algorithm.
 * FSRS is a deterministic algorithm - no AI involved in scheduling.
 *
 * @see https://github.com/open-spaced-repetition/fsrs4anki
 */

// ============================================================================
// FSRS Card State
// ============================================================================

/** Unique identifier for an FSRS card */
export type FSRSCardId = string;

/** Learning states for a card */
export enum FSRSState {
  /** Card has never been reviewed */
  New = 0,
  /** Card is in the learning phase */
  Learning = 1,
  /** Card is in the review phase */
  Review = 2,
  /** Card was forgotten and is being relearned */
  Relearning = 3,
}

/** User's rating after reviewing a card */
export enum ReviewRating {
  /** Complete blackout, no recall */
  Again = 1,
  /** Incorrect but remembered after seeing answer */
  Hard = 2,
  /** Correct with some hesitation */
  Good = 3,
  /** Perfect recall, instant recognition */
  Easy = 4,
}

/** Core FSRS card data */
export interface FSRSCard {
  readonly id: FSRSCardId;
  readonly userId: string;
  readonly checkpointId: string;

  /** Memory stability (higher = more stable) */
  stability: number;

  /** Card difficulty (0-10 scale, higher = harder) */
  difficulty: number;

  /** Days since last review */
  elapsedDays: number;

  /** Days until next scheduled review */
  scheduledDays: number;

  /** Number of times card has been reviewed */
  reps: number;

  /** Current learning state */
  state: FSRSState;

  /** Last review timestamp */
  lastReview: Date | null;

  /** Next scheduled review timestamp */
  nextReview: Date;

  /** Creation timestamp */
  createdAt: Date;
}

/** Parameters for the FSRS algorithm */
export interface FSRSParameters {
  /** Request retention rate (0.7 to 0.99, default 0.9) */
  readonly requestRetention: number;

  /** Maximum interval in days (default 36500 = 100 years) */
  readonly maximumInterval: number;

  /** FSRS-5 model weights (19 values) */
  readonly weights: readonly number[];
}

/** Default FSRS parameters (FSRS-5 defaults) */
export const DEFAULT_FSRS_PARAMETERS: FSRSParameters = {
  requestRetention: 0.9,
  maximumInterval: 36500,
  // FSRS-5 default weights
  weights: [
    0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925,
    1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
  ],
} as const;

/** Result of scheduling a card */
export interface SchedulingResult {
  /** Updated card state */
  readonly card: FSRSCard;

  /** Scheduled interval in days for each possible rating */
  readonly intervals: {
    readonly again: number;
    readonly hard: number;
    readonly good: number;
    readonly easy: number;
  };

  /** Next review dates for each possible rating */
  readonly nextReviewDates: {
    readonly again: Date;
    readonly hard: Date;
    readonly good: Date;
    readonly easy: Date;
  };
}

/** Review log entry for analytics */
export interface ReviewLog {
  readonly cardId: FSRSCardId;
  readonly userId: string;
  readonly rating: ReviewRating;
  readonly state: FSRSState;
  readonly scheduledDays: number;
  readonly elapsedDays: number;
  readonly reviewedAt: Date;
  readonly timeSpentMs: number;
}
