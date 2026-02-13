
import { robustExtractTranscript } from './src/services/robustTranscriptExtractor';
import * as fs from 'fs';

async function test() {
  const videoId = 'dQw4w9WgXcQ'; // Rick Roll
  console.log(`Testing robust transcript extraction for ${videoId}...`);
  
  try {
    // Capture logs to file
    const logs: string[] = [];
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const logFn = (...args: any[]) => {
        logs.push(args.join(' '));
        originalLog(...args);
    };

    console.log = logFn;
    console.warn = logFn;
    console.error = logFn;
    
    const result = await robustExtractTranscript(videoId);
    
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;

    fs.writeFileSync('debug-log.txt', logs.join('\n'), 'utf8');
    
    console.log('--- RESULT ---');
    console.log('Method used:', result.method);
    console.log('Segments found:', result.segments.length);
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

test();
