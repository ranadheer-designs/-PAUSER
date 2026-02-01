/**
 * Pauser Common - FSRS Scheduler
 *
 * Implementation of the Free Spaced Repetition Scheduler (FSRS) algorithm.
 * This is a deterministic scheduling algorithm - no AI involved.
 *
 * FSRS is based on the DSR (Difficulty-Stability-Retrievability) model:
 * - Difficulty: How hard the card is to learn
 * - Stability: How long the memory will last
 * - Retrievability: Probability of recalling the card
 *
 * @see https://github.com/open-spaced-repetition/fsrs4anki
 */

import type { FSRSCard, FSRSParameters, SchedulingResult } from '../types/fsrs';
import { DEFAULT_FSRS_PARAMETERS, FSRSState, ReviewRating } from '../types/fsrs';

// ============================================================================
// Constants
// ============================================================================

/** Minimum stability value to prevent division by zero */
const MIN_STABILITY = 0.01;

/** Learning steps in minutes */
const LEARNING_STEPS_MINUTES = [1, 10] as const;

/** Relearning steps in minutes */
const RELEARNING_STEPS_MINUTES = [10] as const;

/** Days per minute for interval calculations */
const DAYS_PER_MINUTE = 1 / (24 * 60);

// ============================================================================
// Core FSRS Functions
// ============================================================================

/**
 * Calculate the retrievability (probability of recall) for a card.
 *
 * R = (1 + t / (9 * S))^(-1)
 *
 * Where:
 * - t = elapsed time since last review (days)
 * - S = stability (days)
 */
export function calculateRetrievability(elapsedDays: number, stability: number): number {
  if (stability < MIN_STABILITY) {
    return 0;
  }
  const factor = 9;
  return Math.pow(1 + elapsedDays / (factor * stability), -1);
}

/**
 * Calculate the next interval based on desired retention and stability.
 *
 * I = S * (R^(1/-0.5) - 1)
 *
 * Where:
 * - S = stability
 * - R = desired retention (e.g., 0.9)
 */
export function calculateInterval(
  stability: number,
  requestRetention: number,
  maximumInterval: number
): number {
  const decay = -0.5;
  const factor = Math.pow(requestRetention, 1 / decay) - 1;
  const interval = stability * factor;

  // Clamp interval to valid range
  return Math.min(Math.max(Math.round(interval), 1), maximumInterval);
}

/**
 * Calculate initial difficulty based on first rating.
 * D0 = w[4] - (rating - 3) * w[5]
 */
function calculateInitialDifficulty(rating: ReviewRating, weights: readonly number[]): number {
  const w4 = weights[4] ?? 7;
  const w5 = weights[5] ?? 0.5;
  return clamp(w4 - (rating - 3) * w5, 1, 10);
}

/**
 * Calculate initial stability based on first rating.
 * S0 = w[rating - 1]
 */
function calculateInitialStability(rating: ReviewRating, weights: readonly number[]): number {
  const index = rating - 1;
  return Math.max(weights[index] ?? 1, MIN_STABILITY);
}

/**
 * Update difficulty after a review.
 * D' = w[7] * D0 + (1 - w[7]) * (D - w[6] * (rating - 3))
 */
function updateDifficulty(
  currentDifficulty: number,
  rating: ReviewRating,
  weights: readonly number[]
): number {
  const w6 = weights[6] ?? 1.5;
  const w7 = weights[7] ?? 0.0;
  const d0 = calculateInitialDifficulty(rating, weights);

  const newDifficulty = w7 * d0 + (1 - w7) * (currentDifficulty - w6 * (rating - 3));
  return clamp(newDifficulty, 1, 10);
}

/**
 * Calculate stability after a successful recall.
 */
function calculateRecallStability(
  difficulty: number,
  stability: number,
  retrievability: number,
  rating: ReviewRating,
  weights: readonly number[]
): number {
  const w8 = weights[8] ?? 1.5;
  const w9 = weights[9] ?? 0.1;
  const w10 = weights[10] ?? 1.0;
  const w11 = weights[11] ?? 2.0;
  const w15 = weights[15] ?? 0.2;
  const w16 = weights[16] ?? 3.0;

  // Hard penalty
  const hardPenalty = rating === ReviewRating.Hard ? w15 : 1;

  // Easy bonus
  const easyBonus = rating === ReviewRating.Easy ? w16 : 1;

  // Main stability formula
  const newStability =
    stability *
    (1 +
      Math.exp(w8) *
        (11 - difficulty) *
        Math.pow(stability, -w9) *
        (Math.exp((1 - retrievability) * w10) - 1) *
        hardPenalty *
        easyBonus);

  return Math.max(newStability, MIN_STABILITY);
}

/**
 * Calculate stability after forgetting.
 */
function calculateForgetStability(
  difficulty: number,
  stability: number,
  retrievability: number,
  weights: readonly number[]
): number {
  const w11 = weights[11] ?? 2.0;
  const w12 = weights[12] ?? 0.1;
  const w13 = weights[13] ?? 0.3;
  const w14 = weights[14] ?? 2.3;

  const newStability =
    w11 *
    Math.pow(difficulty, -w12) *
    (Math.pow(stability + 1, w13) - 1) *
    Math.exp((1 - retrievability) * w14);

  return Math.max(Math.min(newStability, stability), MIN_STABILITY);
}

// ============================================================================
// Main Scheduler
// ============================================================================

/**
 * Schedule all possible next reviews for a card.
 * Returns intervals and dates for each possible rating (Again, Hard, Good, Easy).
 */
export function scheduleCard(
  card: FSRSCard,
  now: Date = new Date(),
  parameters: FSRSParameters = DEFAULT_FSRS_PARAMETERS
): SchedulingResult {
  const { weights, requestRetention, maximumInterval } = parameters;
  const elapsedDays = card.lastReview
    ? (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24)
    : 0;

  // Calculate current retrievability
  const retrievability =
    card.state === FSRSState.New ? 0 : calculateRetrievability(elapsedDays, card.stability);

  // Calculate intervals for each rating
  const intervals = {
    again: calculateIntervalForRating(
      card,
      ReviewRating.Again,
      retrievability,
      weights,
      requestRetention,
      maximumInterval
    ),
    hard: calculateIntervalForRating(
      card,
      ReviewRating.Hard,
      retrievability,
      weights,
      requestRetention,
      maximumInterval
    ),
    good: calculateIntervalForRating(
      card,
      ReviewRating.Good,
      retrievability,
      weights,
      requestRetention,
      maximumInterval
    ),
    easy: calculateIntervalForRating(
      card,
      ReviewRating.Easy,
      retrievability,
      weights,
      requestRetention,
      maximumInterval
    ),
  };

  // Calculate next review dates
  const nextReviewDates = {
    again: addDays(now, intervals.again),
    hard: addDays(now, intervals.hard),
    good: addDays(now, intervals.good),
    easy: addDays(now, intervals.easy),
  };

  return {
    card,
    intervals,
    nextReviewDates,
  };
}

/**
 * Apply a review rating to a card and return the updated card state.
 */
export function reviewCard(
  card: FSRSCard,
  rating: ReviewRating,
  now: Date = new Date(),
  parameters: FSRSParameters = DEFAULT_FSRS_PARAMETERS
): FSRSCard {
  const { weights, requestRetention, maximumInterval } = parameters;
  const elapsedDays = card.lastReview
    ? (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24)
    : 0;

  const retrievability =
    card.state === FSRSState.New ? 0 : calculateRetrievability(elapsedDays, card.stability);

  let newStability: number;
  let newDifficulty: number;
  let newState: FSRSState;

  if (card.state === FSRSState.New) {
    // First review - use initial values
    newDifficulty = calculateInitialDifficulty(rating, weights);
    newStability = calculateInitialStability(rating, weights);
    newState = rating === ReviewRating.Again ? FSRSState.Learning : FSRSState.Review;
  } else if (rating === ReviewRating.Again) {
    // Forgot the card
    newDifficulty = updateDifficulty(card.difficulty, rating, weights);
    newStability = calculateForgetStability(card.difficulty, card.stability, retrievability, weights);
    newState = FSRSState.Relearning;
  } else {
    // Successful recall
    newDifficulty = updateDifficulty(card.difficulty, rating, weights);
    newStability = calculateRecallStability(
      card.difficulty,
      card.stability,
      retrievability,
      rating,
      weights
    );
    newState = FSRSState.Review;
  }

  const scheduledDays = calculateInterval(newStability, requestRetention, maximumInterval);

  return {
    ...card,
    stability: newStability,
    difficulty: newDifficulty,
    elapsedDays: 0,
    scheduledDays,
    reps: card.reps + 1,
    state: newState,
    lastReview: now,
    nextReview: addDays(now, scheduledDays),
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateIntervalForRating(
  card: FSRSCard,
  rating: ReviewRating,
  retrievability: number,
  weights: readonly number[],
  requestRetention: number,
  maximumInterval: number
): number {
  if (card.state === FSRSState.New || card.state === FSRSState.Learning) {
    // Use learning steps
    const stepIndex = Math.min(card.reps, LEARNING_STEPS_MINUTES.length - 1);
    if (rating === ReviewRating.Again) {
      return LEARNING_STEPS_MINUTES[0] * DAYS_PER_MINUTE;
    }
    if (rating === ReviewRating.Good || rating === ReviewRating.Hard) {
      return (LEARNING_STEPS_MINUTES[stepIndex] ?? 10) * DAYS_PER_MINUTE;
    }
    // Easy graduates immediately
    const stability = calculateInitialStability(rating, weights);
    return calculateInterval(stability, requestRetention, maximumInterval);
  }

  if (rating === ReviewRating.Again) {
    // Use relearning steps
    return RELEARNING_STEPS_MINUTES[0] * DAYS_PER_MINUTE;
  }


  // Calculate stability for a recall rating (Again was already handled above)
  const newStability = calculateRecallStability(
    card.difficulty,
    card.stability,
    retrievability,
    rating,
    weights
  );

  return calculateInterval(newStability, requestRetention, maximumInterval);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setTime(result.getTime() + days * 24 * 60 * 60 * 1000);
  return result;
}

// ============================================================================
// Exports
// ============================================================================

export { FSRSState, ReviewRating } from '../types/fsrs';
export type { FSRSCard, FSRSParameters, SchedulingResult } from '../types/fsrs';
