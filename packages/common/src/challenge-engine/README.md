# Challenge Engine

Deterministic code challenge execution for Pauser.

## Security Model

### Web Worker Isolation

The `runInWorker()` function executes user code in a Web Worker, providing:

| Protection | How It Works |
|------------|--------------|
| **No DOM Access** | Workers cannot access `document`, `window`, `localStorage` |
| **No Network** | `fetch`, `XMLHttpRequest`, `WebSocket` are explicitly blocked |
| **Timeout Enforcement** | `worker.terminate()` kills infinite loops after timeout |
| **Memory Limits** | Browser enforces ~50-100MB per worker |

### ⚠️ Important Warnings

1. **Not a Perfect Sandbox**
   - Determined attackers with browser zero-days could escape
   - For high-security needs, use server-side execution (Firecracker, gVisor)

2. **Browser-Only**
   - `runInWorker()` requires the browser's `Worker` API
   - Returns an error in Node.js environments

3. **No TypeScript**
   - User code must be plain JavaScript
   - TypeScript must be transpiled before execution

4. **No Console Access**
   - `console.log()` inside user code won't propagate to main thread

## Usage

### Basic Execution

```typescript
import { runInWorker } from '@pauser/common';

const result = await runInWorker(
  'function add(a, b) { return a + b; }',
  [
    { id: 't1', name: 'Add 1+2', input: [1, 2], expectedOutput: 3, isHidden: false },
    { id: 't2', name: 'Add negatives', input: [-1, -1], expectedOutput: -2, isHidden: true }
  ],
  'add',
  5000 // 5 second timeout
);

if (result.success) {
  console.log('Tests passed:', result.results.filter(r => r.passed).length);
} else {
  console.error('Execution failed:', result.error);
}
```

### Handling Infinite Loops

```typescript
const result = await runInWorker(
  'function infinite() { while(true) {} }',
  [{ id: 't1', name: 'Test', input: [], expectedOutput: undefined, isHidden: false }],
  'infinite',
  2000 // 2 second timeout
);

// result.success === false
// result.error === "Execution timeout (2000ms). Possible infinite loop."
```

## Result Structure

```typescript
interface WorkerExecutionResult {
  success: boolean;           // Overall success (all tests passed)
  results: WorkerTestResult[]; // Individual test results
  error?: string;              // Global error message
  totalTimeMs: number;         // Total execution time
}

interface WorkerTestResult {
  testId: string;
  testName: string;
  passed: boolean;
  actual: unknown;
  expected: unknown;
  error?: string;
  timeMs: number;
}
```

## Comparison: runInWorker vs runJavaScriptTests

| Feature | `runInWorker` | `runJavaScriptTests` |
|---------|---------------|----------------------|
| Isolation | Web Worker (sandboxed) | Main thread (unsafe) |
| Timeout | Hard kill via terminate() | Soft timeout (can be bypassed) |
| Browser | ✅ Required | ✅ Works |
| Node.js | ❌ Not supported | ✅ Works |
| Speed | Slightly slower (worker overhead) | Faster |

**Recommendation:** Always use `runInWorker()` in production browser environments.
