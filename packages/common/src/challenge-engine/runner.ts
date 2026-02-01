/**
 * Pauser Challenge Engine - Runner
 *
 * Deterministic code challenge evaluation.
 * Runs user code against pre-defined test cases WITHOUT ANY AI.
 *
 * Security Note: This is a basic implementation. In production,
 * code should be executed in a sandboxed environment (Web Worker, VM, etc.)
 */

import type {
  ChallengeLanguage,
  ChallengeResult,
  ChallengeTestCase,
  RunnerConfig,
  TestCaseResult,
} from './types';
import { DEFAULT_RUNNER_CONFIG } from './types';

// ============================================================================
// Output Comparison
// ============================================================================

/**
 * Compare expected and actual outputs for equality.
 * Handles primitives, arrays, and objects with deep comparison.
 */
export function compareOutputs(expected: unknown, actual: unknown): boolean {
  // Handle null/undefined
  if (expected === null || expected === undefined) {
    return actual === expected;
  }

  // Handle primitives
  if (typeof expected !== 'object') {
    // Handle floating point comparison
    if (typeof expected === 'number' && typeof actual === 'number') {
      // Use epsilon for float comparison
      const epsilon = 1e-9;
      return Math.abs(expected - actual) < epsilon;
    }
    return expected === actual;
  }

  // Handle arrays
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || expected.length !== actual.length) {
      return false;
    }
    return expected.every((item, index) => compareOutputs(item, actual[index]));
  }

  // Handle objects
  if (typeof actual !== 'object' || actual === null) {
    return false;
  }

  const expectedKeys = Object.keys(expected as Record<string, unknown>);
  const actualKeys = Object.keys(actual as Record<string, unknown>);

  if (expectedKeys.length !== actualKeys.length) {
    return false;
  }

  return expectedKeys.every((key) =>
    compareOutputs(
      (expected as Record<string, unknown>)[key],
      (actual as Record<string, unknown>)[key]
    )
  );
}

// ============================================================================
// JavaScript Runner
// ============================================================================

/**
 * Execute JavaScript code and run test cases.
 *
 * WARNING: This uses eval() and is NOT SAFE for untrusted code.
 * In production, use a Web Worker or sandboxed VM.
 */
export async function runJavaScriptTests(
  code: string,
  testCases: readonly ChallengeTestCase[],
  functionName: string,
  config: RunnerConfig = DEFAULT_RUNNER_CONFIG
): Promise<TestCaseResult[]> {
  const results: TestCaseResult[] = [];

  // Create a sandboxed function from user code
  let userFunction: (...args: unknown[]) => unknown;

  try {
    // Wrap code to extract the function
    const wrappedCode = `
      ${code}
      if (typeof ${functionName} === 'function') {
        return ${functionName};
      }
      throw new Error('Function ${functionName} not found');
    `;

    // Create function from code (NOT SAFE - use Web Worker in production)
    const factory = new Function(wrappedCode);
    userFunction = factory() as (...args: unknown[]) => unknown;
  } catch (error) {
    // Code failed to parse/compile
    const errorMessage = error instanceof Error ? error.message : 'Unknown compilation error';
    return testCases.map((test) => ({
      testId: test.id,
      testName: test.name,
      passed: false,
      actualOutput: undefined,
      expectedOutput: test.expectedOutput,
      errorMessage: `Compilation Error: ${errorMessage}`,
      executionTimeMs: 0,
    }));
  }

  // Run each test case
  for (const testCase of testCases) {
    const startTime = performance.now();
    let actualOutput: unknown;
    let errorMessage: string | undefined;
    let passed = false;

    try {
      // Execute with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Execution timeout')), config.timeoutMs);
      });

      const executionPromise = Promise.resolve(userFunction(...testCase.input));

      actualOutput = await Promise.race([executionPromise, timeoutPromise]);
      passed = compareOutputs(testCase.expectedOutput, actualOutput);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Runtime error';
      passed = false;
    }

    const executionTimeMs = performance.now() - startTime;

    results.push({
      testId: testCase.id,
      testName: testCase.name,
      passed,
      actualOutput,
      expectedOutput: testCase.expectedOutput,
      errorMessage,
      executionTimeMs,
    });
  }

  return results;
}

// ============================================================================
// Main Runner
// ============================================================================

/**
 * Run a code challenge and return the complete result.
 */
export async function runChallenge(
  challengeId: string,
  userId: string,
  code: string,
  language: ChallengeLanguage,
  testCases: readonly ChallengeTestCase[],
  functionName: string,
  config: RunnerConfig = DEFAULT_RUNNER_CONFIG
): Promise<ChallengeResult> {
  const startTime = performance.now();

  let testResults: TestCaseResult[];

  // Language-specific execution
  switch (language) {
    case 'javascript':
    case 'typescript': // TypeScript is transpiled to JS before running
      testResults = await runJavaScriptTests(code, testCases, functionName, config);
      break;
    case 'python':
      // Python would require a backend service or Pyodide
      testResults = testCases.map((test) => ({
        testId: test.id,
        testName: test.name,
        passed: false,
        actualOutput: undefined,
        expectedOutput: test.expectedOutput,
        errorMessage: 'Python execution not implemented in browser',
        executionTimeMs: 0,
      }));
      break;
    default:
      throw new Error(`Unsupported language: ${language as string}`);
  }

  const passedCount = testResults.filter((r) => r.passed).length;
  const totalExecutionTimeMs = performance.now() - startTime;

  return {
    challengeId,
    userId,
    passed: passedCount === testResults.length,
    passedCount,
    totalCount: testResults.length,
    testResults,
    totalExecutionTimeMs,
    submittedAt: new Date(),
  };
}

// ============================================================================
// Exports
// ============================================================================

export type {
  ChallengeLanguage,
  ChallengeTestCase,
  TestCaseResult,
  ChallengeResult,
  RunnerConfig,
} from './types';

export { DEFAULT_RUNNER_CONFIG } from './types';
