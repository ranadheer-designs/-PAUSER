/**
 * Pauser Challenge Engine - Types
 *
 * Types for deterministic code challenge evaluation.
 * All evaluation is done without AI - just running test cases.
 */

/** Supported programming languages */
export type ChallengeLanguage = 'javascript' | 'typescript' | 'python';

/** A single test case input/output pair */
export interface ChallengeTestCase {
  readonly id: string;
  readonly name: string;
  readonly input: readonly unknown[];
  readonly expectedOutput: unknown;
  /** Hidden tests are not shown to the user */
  readonly isHidden: boolean;
}

/** Result of running a single test case */
export interface TestCaseResult {
  readonly testId: string;
  readonly testName: string;
  readonly passed: boolean;
  readonly actualOutput: unknown;
  readonly expectedOutput: unknown;
  readonly errorMessage?: string;
  readonly executionTimeMs: number;
}

/** Result of running all test cases for a challenge */
export interface ChallengeResult {
  readonly challengeId: string;
  readonly userId: string;
  readonly passed: boolean;
  readonly passedCount: number;
  readonly totalCount: number;
  readonly testResults: readonly TestCaseResult[];
  readonly totalExecutionTimeMs: number;
  readonly submittedAt: Date;
}

/** Configuration for the challenge runner */
export interface RunnerConfig {
  /** Maximum execution time per test in milliseconds */
  readonly timeoutMs: number;
  /** Maximum memory usage in bytes (if supported) */
  readonly maxMemoryBytes?: number;
}

/** Default runner configuration */
export const DEFAULT_RUNNER_CONFIG: RunnerConfig = {
  timeoutMs: 5000, // 5 seconds per test
  maxMemoryBytes: 50 * 1024 * 1024, // 50 MB
} as const;
