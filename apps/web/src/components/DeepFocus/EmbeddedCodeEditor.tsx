'use client';

/**
 * EmbeddedCodeEditor Component
 * 
 * A premium code editor for in-sidebar coding practice.
 * Uses a styled textarea by default, with optional Monaco support if installed.
 * 
 * Features:
 * - Code editing with syntax highlighting (via prism.js or Monaco if available)
 * - Browser-based JavaScript execution
 * - Test case validation
 * - Progressive hints system
 * - Auto-save to learning artifacts
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import styles from './EmbeddedCodeEditor.module.css';

// Dynamically import Monaco Editor to avoid SSR issues
const Editor = dynamic(
  () => import('@monaco-editor/react'),
  { 
    ssr: false,
    loading: () => (
      <div className={styles.editorLoading}>
        <div className={styles.spinner}></div>
        <span>Loading editor...</span>
      </div>
    ),
  }
);

// Types
interface TestCase {
  input: unknown;
  expected: unknown;
  description?: string;
}

interface TestResult {
  passed: boolean;
  input: unknown;
  expected: unknown;
  actual: unknown;
  error?: string;
}

interface EmbeddedEditorConfig {
  language: string;
  starterCode: string;
  testCases?: TestCase[];
  hints?: string[];
  buggyCode?: string;
  solution?: string;
}

interface CodeCheckpoint {
  id: string;
  title: string;
  context: string;
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
  embeddedEditor: EmbeddedEditorConfig;
}

interface EmbeddedCodeEditorProps {
  checkpoint: CodeCheckpoint;
  onComplete: (code: string, testResults: TestResult[]) => void;
  onSkip: () => void;
  onSaveForLater?: (checkpoint: CodeCheckpoint, code: string) => void;
}

/**
 * Execute JavaScript code in a sandboxed environment
 */
async function executeJavaScript(
  code: string, 
  testCases: TestCase[]
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (const testCase of testCases) {
    try {
      // Create a sandboxed function from the user code
      const wrappedCode = `
        ${code}
        
        // Try to find the main function
        const fnNames = Object.keys(this).filter(k => typeof this[k] === 'function');
        const mainFn = fnNames.find(n => !n.startsWith('__')) || fnNames[0];
        
        if (typeof solution === 'function') return solution;
        if (typeof twoSum === 'function') return twoSum;
        if (typeof fn === 'function') return fn;
        if (mainFn) return this[mainFn];
        return null;
      `;

      // Execute in a controlled way
      // eslint-disable-next-line no-new-func
      const executor = new Function('input', `
        try {
          ${code}
          
          // Find any defined function
          const defined = [];
          ${extractFunctionNames(code).map(n => `if (typeof ${n} !== 'undefined') defined.push(${n});`).join('\n')}
          
          const fn = defined[0];
          if (!fn) throw new Error('No function defined');
          
          const args = Array.isArray(input) ? input : [input];
          return fn(...args);
        } catch (e) {
          throw e;
        }
      `);

      const input = testCase.input;
      const actual = executor(input);
      const expected = testCase.expected;
      const passed = JSON.stringify(actual) === JSON.stringify(expected);

      results.push({
        passed,
        input,
        expected,
        actual,
      });
    } catch (error) {
      results.push({
        passed: false,
        input: testCase.input,
        expected: testCase.expected,
        actual: undefined,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

/**
 * Extract function names from code
 */
function extractFunctionNames(code: string): string[] {
  const functionPattern = /function\s+(\w+)|const\s+(\w+)\s*=\s*(?:function|\(|async)/g;
  const names: string[] = [];
  let match;
  
  while ((match = functionPattern.exec(code)) !== null) {
    const name = match[1] || match[2];
    if (name) names.push(name);
  }
  
  return names;
}

export function EmbeddedCodeEditor({
  checkpoint,
  onComplete,
  onSkip,
  onSaveForLater,
}: EmbeddedCodeEditorProps) {
  const [code, setCode] = useState(checkpoint.embeddedEditor.starterCode);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start timer when component mounts
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Run tests
  const runTests = useCallback(async () => {
    if (!checkpoint.embeddedEditor.testCases?.length) {
      // No test cases - just complete
      onComplete(code, []);
      return;
    }

    setIsRunning(true);
    setTestResults([]);

    try {
      const results = await executeJavaScript(code, checkpoint.embeddedEditor.testCases);
      setTestResults(results);

      const allPassed = results.every(r => r.passed);
      if (allPassed) {
        // Optional: auto-complete after brief delay to show success
        setTimeout(() => {
          onComplete(code, results);
        }, 1000);
      }
    } catch (error) {
      console.error('Code execution error:', error);
    } finally {
      setIsRunning(false);
    }
  }, [code, checkpoint.embeddedEditor.testCases, onComplete]);

  // Show next hint
  const showNextHint = useCallback(() => {
    if (!showHints) {
      setShowHints(true);
    } else if (checkpoint.embeddedEditor.hints && currentHintIndex < checkpoint.embeddedEditor.hints.length - 1) {
      setCurrentHintIndex(prev => prev + 1);
    }
  }, [showHints, currentHintIndex, checkpoint.embeddedEditor.hints]);

  // Save for later
  const handleSaveForLater = useCallback(() => {
    if (onSaveForLater) {
      onSaveForLater(checkpoint, code);
    }
    onSkip();
  }, [code, checkpoint, onSkip, onSaveForLater]);

  const allPassed = testResults.length > 0 && testResults.every(r => r.passed);
  const hints = checkpoint.embeddedEditor.hints || [];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleSection}>
            <span className={styles.typeIcon}>💻</span>
            <h3 className={styles.title}>{checkpoint.title}</h3>
          </div>
          <div className={styles.meta}>
            <span className={`${styles.difficulty} ${styles[checkpoint.difficulty]}`}>
              {checkpoint.difficulty}
            </span>
            <span className={styles.timer}>⏱️ {formatTime(timeSpent)}</span>
          </div>
        </div>
        <p className={styles.context}>{checkpoint.context}</p>
        <p className={styles.estimatedTime}>
          Estimated: {checkpoint.estimatedTime}
        </p>
      </div>

      {/* Monaco Editor */}
      <div className={styles.editorContainer}>
        <div className={styles.editorHeader}>
          <span className={styles.languageBadge}>
            {checkpoint.embeddedEditor.language}
          </span>
          <div className={styles.editorActions}>
            <button
              className={styles.resetButton}
              onClick={() => setCode(checkpoint.embeddedEditor.starterCode)}
              title="Reset to starter code"
            >
              ↺ Reset
            </button>
          </div>
        </div>
        <div className={styles.monacoWrapper}>
          <Editor
            height="320px"
            language={checkpoint.embeddedEditor.language}
            value={code}
            onChange={(value: string | undefined) => setCode(value || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              padding: { top: 16, bottom: 16 },
              renderLineHighlight: 'all',
              cursorBlinking: 'smooth',
              smoothScrolling: true,
            }}
          />
        </div>
      </div>

      {/* Test Panel */}
      <div className={styles.testPanel}>
        <div className={styles.testHeader}>
          <button
            className={`${styles.runButton} ${isRunning ? styles.running : ''}`}
            onClick={runTests}
            disabled={isRunning}
          >
            {isRunning ? '⏳ Running...' : '▶ Run Tests'}
          </button>
          {testResults.length > 0 && (
            <span className={styles.testSummary}>
              {testResults.filter(r => r.passed).length}/{testResults.length} passed
            </span>
          )}
        </div>

        {testResults.length > 0 && (
          <div className={styles.testResults}>
            {testResults.map((result, i) => (
              <div
                key={i}
                className={`${styles.testCase} ${result.passed ? styles.passed : styles.failed}`}
              >
                <div className={styles.testStatus}>
                  <span className={styles.testIcon}>{result.passed ? '✓' : '✗'}</span>
                  <span className={styles.testLabel}>
                    Test {i + 1}: {result.passed ? 'Passed' : 'Failed'}
                  </span>
                </div>
                <div className={styles.testDetails}>
                  <div>Input: <code>{JSON.stringify(result.input)}</code></div>
                  <div>Expected: <code>{JSON.stringify(result.expected)}</code></div>
                  {!result.passed && (
                    <div className={styles.testActual}>
                      Got: <code>{result.error || JSON.stringify(result.actual)}</code>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hints Section */}
      {hints.length > 0 && (
        <div className={styles.hintsSection}>
          {showHints ? (
            <div className={styles.hintBox}>
              <div className={styles.hintHeader}>
                💡 Hint {currentHintIndex + 1} of {hints.length}
              </div>
              <p className={styles.hintText}>{hints[currentHintIndex]}</p>
              {currentHintIndex < hints.length - 1 && (
                <button className={styles.nextHintButton} onClick={showNextHint}>
                  Next hint →
                </button>
              )}
            </div>
          ) : (
            <button className={styles.showHintButton} onClick={showNextHint}>
              💡 Need a hint?
            </button>
          )}
        </div>
      )}

      {/* Solution Reveal */}
      {checkpoint.embeddedEditor.solution && (
        <div className={styles.solutionSection}>
          {showSolution ? (
            <div className={styles.solutionBox}>
              <div className={styles.solutionHeader}>📖 Solution</div>
              <pre className={styles.solutionCode}>
                {checkpoint.embeddedEditor.solution}
              </pre>
            </div>
          ) : (
            <button
              className={styles.showSolutionButton}
              onClick={() => setShowSolution(true)}
            >
              📖 Show Solution
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <div className={styles.leftActions}>
          <button className={styles.skipButton} onClick={onSkip}>
            Skip for now
          </button>
          {onSaveForLater && (
            <button className={styles.saveButton} onClick={handleSaveForLater}>
              💾 Save for later
            </button>
          )}
        </div>
        <button
          className={`${styles.completeButton} ${allPassed ? styles.success : ''}`}
          onClick={() => onComplete(code, testResults)}
          disabled={isRunning}
        >
          {allPassed ? '✓ Complete!' : 'Submit Anyway'}
        </button>
      </div>
    </div>
  );
}

export default EmbeddedCodeEditor;
