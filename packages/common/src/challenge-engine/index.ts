/**
 * Pauser Challenge Engine Module
 *
 * Exports the deterministic code challenge evaluation system.
 */

export { compareOutputs, runJavaScriptTests, runChallenge } from './runner';

export type {
  ChallengeLanguage,
  ChallengeTestCase,
  TestCaseResult,
  ChallengeResult,
  RunnerConfig,
} from './runner';

export { DEFAULT_RUNNER_CONFIG } from './runner';

// Secure Worker-based execution (browser-only)
export {
  runInWorker,
  workerResultsToTestResults,
} from './worker-runner';

export type {
  WorkerTestResult,
  WorkerExecutionResult,
} from './worker-runner';
