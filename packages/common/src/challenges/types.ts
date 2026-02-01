import { ChallengeLanguage, ChallengeTestCase } from '../challenge-engine';

/**
 * Challenge difficulty level (1-5).
 * 1: Trivial (syntax check)
 * 2: Basic logic (loops/conditionals)
 * 3: Intermediate (arrays/objects/combinations)
 * 4: Advanced (recursion/complex data)
 * 5: Expert (optimization/edge cases)
 */
export type ChallengeDifficulty = 1 | 2 | 3 | 4 | 5;

/**
 * Template for creating a coding challenge input + tests without execution result.
 */
export interface ChallengeTemplate {
  /** Unique ID for this template (e.g. 'sum-range') */
  readonly id: string;
  
  /** Target language */
  readonly language: ChallengeLanguage;
  
  /** Concepts this challenge reinforces */
  readonly concepts: readonly string[];
  
  /** Difficulty rating */
  readonly difficulty: ChallengeDifficulty;
  
  /** User-facing title */
  readonly title: string;
  
  /** User-facing description/prompt */
  readonly prompt: string;
  
  /** Initial code in editor */
  readonly starterCode: string;
  
  /** Expected function name to be defined */
  readonly functionName: string;
  
  /**
   * Generates test cases for this challenge.
   * Can use randomness to create unique variants.
   */
  readonly testFactory: () => ChallengeTestCase[];
}
