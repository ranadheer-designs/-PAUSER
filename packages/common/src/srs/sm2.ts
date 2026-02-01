/**
 * SM-2 Spaced Repetition Algorithm
 * 
 * A deterministic, offline-capable algorithm for scheduling reviews.
 * 
 * Algorithm Summary:
 * I(0) = 0
 * I(1) = 1
 * I(2) = 6
 * I(n) = I(n-1) * EF
 * 
 * EF' = EF + (0.1 - (5-q) * (0.08 + (5-q)*0.02))
 * 
 * Where:
 * I = Interval in days
 * EF = Easiness Factor (min 1.3)
 * q  = Review grade (0-5)
 */

import type { SM2Card, ReviewGrade, SM2Schedule } from './types';

export const DEFAULT_SM2_CARD: SM2Card = {
  easeFactor: 2.5,
  interval: 0,
  repetitions: 0,
};

const MIN_EASE_FACTOR = 1.3;

/**
 * Calculate the next review schedule for a card using SM-2.
 * 
 * @param currentCard Current state of the card (or default for new cards)
 * @param grade Review grade (0-5)
 * @param reviewDate The date the review took place (defaults to now)
 */
export function calculateSM2(
  currentCard: SM2Card = DEFAULT_SM2_CARD,
  grade: ReviewGrade,
  reviewDate: Date = new Date()
): SM2Schedule {
  let { easeFactor, repetitions, interval } = currentCard;

  if (grade >= 3) {
    // Correct response (Pass)
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
    
    // Update Easiness Factor
    // Formula: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q)*0.02))
    const q = grade;
    easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    
  } else {
    // Incorrect response (Fail)
    repetitions = 0;
    interval = 1;
    // EF is usually unchanged on fail in strictly standard SM-2
    // Some variants penalize EF, but standard says keep previous.
  }

  // Ensure EF doesn't drop below 1.3
  if (easeFactor < MIN_EASE_FACTOR) {
    easeFactor = MIN_EASE_FACTOR;
  }

  // Calculate due date
  // For intervals < 1 (conceptually minutes), we default to 1 day minimum in this implementation 
  // as SM-2 is day-based. 
  // Handling sub-day intervals (learning steps) is often done outside standard SM-2 logic.
  const dueDate = new Date(reviewDate);
  dueDate.setDate(dueDate.getDate() + interval);
  
  // Reset time to start of day or keep review time? 
  // Usually strict scheduling keeps time, but for ease of use we'll just add days.

  return {
    card: {
      easeFactor,
      interval,
      repetitions,
    },
    dueDate,
  };
}

/**
 * Utility to get the default new card state
 */
export function getNewSM2Card(): SM2Card {
  return { ...DEFAULT_SM2_CARD };
}
