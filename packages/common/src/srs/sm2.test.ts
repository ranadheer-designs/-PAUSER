import { describe, it, expect } from 'vitest';
import { calculateSM2, getNewSM2Card } from './sm2';
import type { ReviewGrade } from './types';

describe('SM-2 Algorithm', () => {
  it('should initialize a new card correctly', () => {
    const card = getNewSM2Card();
    expect(card).toEqual({
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
    });
  });

  it('should handle first correct review (Grade 4)', () => {
    const card = getNewSM2Card();
    const result = calculateSM2(card, 4);

    expect(result.card.interval).toBe(1);
    expect(result.card.repetitions).toBe(1);
    expect(result.card.easeFactor).toBe(2.5); // Grade 4 shouldn't change EF (checking formula below)
    // EF + (0.1 - (5-4)*(0.08+(5-4)*0.02))
    // 2.5 + (0.1 - 1 * (0.1)) = 2.5
  });

  it('should handle second correct review (Grade 4) -> Interval 6', () => {
    const card = { easeFactor: 2.5, interval: 1, repetitions: 1 };
    const result = calculateSM2(card, 4);

    expect(result.card.interval).toBe(6);
    expect(result.card.repetitions).toBe(2);
  });

  it('should handle third correct review -> Interval grows by EF', () => {
    const card = { easeFactor: 2.5, interval: 6, repetitions: 2 };
    const result = calculateSM2(card, 4);

    // 6 * 2.5 = 15
    expect(result.card.interval).toBe(15);
    expect(result.card.repetitions).toBe(3);
  });

  it('should reset repetitions and interval on fail (Grade 1)', () => {
    const card = { easeFactor: 2.8, interval: 15, repetitions: 3 };
    const result = calculateSM2(card, 1); // Fail

    expect(result.card.repetitions).toBe(0);
    expect(result.card.interval).toBe(1);
    // Standard SM-2 doesn't penalize EF on fail, or implementation choice.
    // Our implementation preserves EF.
    expect(result.card.easeFactor).toBe(2.8);
  });

  it('should increase EF on Grade 5', () => {
    const card = { easeFactor: 2.5, interval: 6, repetitions: 2 };
    const result = calculateSM2(card, 5); // Perfect

    // EF + (0.1 - (5-5)...) -> EF + 0.1
    expect(result.card.easeFactor).toBeCloseTo(2.6);
  });

  it('should decrease EF on Grade 3', () => {
    const card = { easeFactor: 2.5, interval: 6, repetitions: 2 };
    const result = calculateSM2(card, 3); // Hard pass

    // EF + (0.1 - (2)*(0.08 + 2*0.02))
    // 2.5 + (0.1 - 2*(0.12))
    // 2.5 + (0.1 - 0.24) = 2.36
    expect(result.card.easeFactor).toBeCloseTo(2.36);
  });

  it('should not let EF drop below 1.3', () => {
    const card = { easeFactor: 1.35, interval: 6, repetitions: 2 };
    // Grade 3 drops it by 0.14
    const result = calculateSM2(card, 3);

    expect(result.card.easeFactor).toBe(1.3); // Clamped
  });

  it('should return correct due date', () => {
    const card = getNewSM2Card();
    const today = new Date('2025-01-01T12:00:00Z');
    
    const result = calculateSM2(card, 4, today);
    
    // Interval 1 -> Next day
    const expected = new Date('2025-01-02T12:00:00Z');
    expect(result.dueDate.toISOString()).toBe(expected.toISOString());
  });
});
