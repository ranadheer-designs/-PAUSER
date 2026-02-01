/**
 * Web Worker Code Execution
 * 
 * This module generates the code that runs inside a Web Worker.
 * The worker executes user code in isolation from the main thread.
 * 
 * SECURITY NOTES:
 * - Workers have NO access to DOM, window, localStorage, document
 * - Workers cannot make network requests (we don't provide fetch)
 * - Infinite loops are handled via timeout + worker.terminate()
 * - Memory is browser-limited (~50-100MB per worker)
 * 
 * LIMITATIONS:
 * - Browser-only (Node.js requires worker_threads)
 * - No TypeScript execution (must be transpiled first)
 * - console.log from worker may not propagate
 */

import type { ChallengeTestCase, TestCaseResult } from './types';

export interface WorkerTestResult {
  testId: string;
  testName: string;
  passed: boolean;
  actual: unknown;
  expected: unknown;
  error?: string;
  timeMs: number;
}

export interface WorkerExecutionResult {
  success: boolean;
  results: WorkerTestResult[];
  error?: string;
  totalTimeMs: number;
}

/**
 * Generates the worker script as a string.
 * This code runs in complete isolation.
 */
function generateWorkerCode(): string {
  return `
// ============================================================================
// SANDBOXED WORKER CODE
// ============================================================================

// Block dangerous globals (defense in depth)
self.fetch = undefined;
self.XMLHttpRequest = undefined;
self.WebSocket = undefined;
self.importScripts = undefined;

// Deep comparison for test results
function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'number' && typeof b === 'number') {
    // Handle floating point
    if (Math.abs(a - b) < 1e-9) return true;
    return false;
  }
  
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  
  if (typeof a === 'object') {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every(key => deepEqual(a[key], b[key]));
  }
  
  return false;
}

// Message handler
self.onmessage = function(e) {
  const { code, tests, functionName } = e.data;
  const results = [];
  const startTotal = performance.now();
  
  try {
    // Create and run user function
    const userFn = new Function(code + '; return ' + functionName + ';')();
    
    if (typeof userFn !== 'function') {
      self.postMessage({
        success: false,
        error: 'Function "' + functionName + '" not found or not a function',
        results: [],
        totalTimeMs: performance.now() - startTotal
      });
      return;
    }
    
    // Run each test
    for (const test of tests) {
      const startTest = performance.now();
      let actual, error, passed = false;
      
      try {
        actual = userFn.apply(null, test.input);
        passed = deepEqual(test.expectedOutput, actual);
      } catch (err) {
        error = err.message || 'Runtime error';
      }
      
      results.push({
        testId: test.id,
        testName: test.name,
        passed,
        actual,
        expected: test.expectedOutput,
        error,
        timeMs: performance.now() - startTest
      });
    }
    
    self.postMessage({
      success: true,
      results,
      totalTimeMs: performance.now() - startTotal
    });
    
  } catch (err) {
    self.postMessage({
      success: false,
      error: 'Compilation error: ' + (err.message || 'Unknown'),
      results: [],
      totalTimeMs: performance.now() - startTotal
    });
  }
};
`;
}

/**
 * Execute JavaScript code in a Web Worker with timeout protection.
 * 
 * @param code - User code to execute
 * @param tests - Test cases to run
 * @param functionName - Function to extract and call
 * @param timeoutMs - Maximum execution time (default: 5000ms)
 * @returns Promise with test results
 * 
 * @example
 * const result = await runInWorker(
 *   'function add(a, b) { return a + b; }',
 *   [{ id: 't1', name: 'Add 1+2', input: [1, 2], expectedOutput: 3, isHidden: false }],
 *   'add'
 * );
 */
export async function runInWorker(
  code: string,
  tests: readonly ChallengeTestCase[],
  functionName: string,
  timeoutMs = 5000
): Promise<WorkerExecutionResult> {
  // Check if Worker is available (browser-only)
  if (typeof Worker === 'undefined') {
    return {
      success: false,
      error: 'Web Workers not available. This function is browser-only.',
      results: [],
      totalTimeMs: 0
    };
  }

  return new Promise((resolve) => {
    const startTime = performance.now();
    
    // Create worker from blob
    const workerCode = generateWorkerCode();
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    
    // Timeout handler
    const timeoutId = setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      resolve({
        success: false,
        error: `Execution timeout (${timeoutMs}ms). Possible infinite loop.`,
        results: [],
        totalTimeMs: timeoutMs
      });
    }, timeoutMs);
    
    // Result handler
    worker.onmessage = (e: MessageEvent<WorkerExecutionResult>) => {
      clearTimeout(timeoutId);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      resolve(e.data);
    };
    
    // Error handler
    worker.onerror = (e) => {
      clearTimeout(timeoutId);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      resolve({
        success: false,
        error: `Worker error: ${e.message}`,
        results: [],
        totalTimeMs: performance.now() - startTime
      });
    };
    
    // Send code and tests to worker
    worker.postMessage({
      code,
      tests,
      functionName
    });
  });
}

/**
 * Convert WorkerExecutionResult to standard TestCaseResult[] format.
 */
export function workerResultsToTestResults(
  workerResult: WorkerExecutionResult
): TestCaseResult[] {
  if (!workerResult.success && workerResult.results.length === 0) {
    // Global error - no individual test results
    return [];
  }
  
  return workerResult.results.map(r => ({
    testId: r.testId,
    testName: r.testName,
    passed: r.passed,
    actualOutput: r.actual,
    expectedOutput: r.expected,
    errorMessage: r.error,
    executionTimeMs: r.timeMs
  }));
}
