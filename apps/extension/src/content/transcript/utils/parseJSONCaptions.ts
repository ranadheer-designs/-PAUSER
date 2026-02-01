/**
 * JSON Caption Parser
 * 
 * Parses YouTube's JSON caption format (fmt=json3) into TranscriptSegments.
 * 
 * YouTube JSON format:
 * {
 *   "events": [
 *     {"tStartMs": 500, "dDurationMs": 2300, "segs": [{"utf8": "Hello world"}]},
 *     {"tStartMs": 2800, "dDurationMs": 1500, "segs": [{"utf8": "This is "}, {"utf8": "a subtitle"}]}
 *   ]
 * }
 */

import type { TranscriptSegment } from '@pauser/common';
import { normalizeText, lightNormalize } from './normalizeText';

/**
 * Caption event from YouTube's JSON format
 */
interface CaptionEvent {
  /** Start time in milliseconds */
  tStartMs?: number;
  /** Duration in milliseconds */
  dDurationMs?: number;
  /** Text segments */
  segs?: Array<{
    utf8?: string;
    /** Offset within this event (rarely used) */
    tOffsetMs?: number;
  }>;
  /** Window style ID (for positioning, ignored) */
  wWinId?: number;
  /** Pen style ID (for styling, ignored) */
  pPenId?: number;
  /** Segment ID */
  id?: number;
  /** Wordposition (ignored) */
  wp?: number;
  /** Style (ignored) */
  style?: number;
}

/**
 * Root structure of YouTube's JSON caption response
 */
interface CaptionJSON {
  /** Array of caption events */
  events?: CaptionEvent[];
  /** Wire version (ignored) */
  wireMagic?: string;
}

/**
 * Parse JSON caption string into transcript segments
 */
export function parseJSONCaptions(jsonString: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  
  if (!jsonString || typeof jsonString !== 'string') {
    return segments;
  }
  
  try {
    const data: CaptionJSON = JSON.parse(jsonString);
    
    if (!data.events || !Array.isArray(data.events)) {
      console.warn('[Pauser] No events found in JSON caption data');
      return segments;
    }
    
    for (const event of data.events) {
      // Skip events without timing or segments
      if (event.tStartMs === undefined || !event.segs) {
        continue;
      }
      
      // Combine all segment text
      const rawText = event.segs
        .map(seg => seg.utf8 || '')
        .join('');
      
      // Skip empty or whitespace-only segments
      const cleanedText = normalizeText(rawText);
      if (cleanedText.length === 0) {
        continue;
      }
      
      // Convert milliseconds to seconds
      const startTime = event.tStartMs / 1000;
      const duration = (event.dDurationMs || 0) / 1000;
      const endTime = startTime + duration;
      
      segments.push({
        startTime,
        endTime,
        rawText: lightNormalize(rawText),
        cleanedText,
      });
    }
  } catch (error) {
    console.error('[Pauser] Error parsing JSON captions:', error);
    return segments;
  }
  
  return segments;
}

/**
 * Detect if a string is JSON caption format
 */
export function isJSONCaptionFormat(str: string): boolean {
  const trimmed = str.trim();
  if (!trimmed.startsWith('{')) return false;
  
  try {
    const data = JSON.parse(trimmed);
    return data.events !== undefined || data.wireMagic !== undefined;
  } catch {
    return false;
  }
}

/**
 * Merge very short segments that represent word-by-word captions
 * Common in auto-generated captions
 */
export function mergeWordSegments(
  segments: TranscriptSegment[],
  minDurationSeconds: number = 0.5
): TranscriptSegment[] {
  if (segments.length === 0) return [];
  
  const merged: TranscriptSegment[] = [];
  let buffer: TranscriptSegment[] = [];
  
  for (const segment of segments) {
    buffer.push(segment);
    
    // Check if buffer duration exceeds minimum
    const bufferDuration = buffer[buffer.length - 1].endTime - buffer[0].startTime;
    
    if (bufferDuration >= minDurationSeconds) {
      // Merge buffer into single segment
      const mergedSegment: TranscriptSegment = {
        startTime: buffer[0].startTime,
        endTime: buffer[buffer.length - 1].endTime,
        rawText: buffer.map(s => s.rawText).join(' ').replace(/\s+/g, ' ').trim(),
        cleanedText: buffer.map(s => s.cleanedText).join(' ').replace(/\s+/g, ' ').trim(),
      };
      merged.push(mergedSegment);
      buffer = [];
    }
  }
  
  // Handle remaining buffer
  if (buffer.length > 0) {
    const mergedSegment: TranscriptSegment = {
      startTime: buffer[0].startTime,
      endTime: buffer[buffer.length - 1].endTime,
      rawText: buffer.map(s => s.rawText).join(' ').replace(/\s+/g, ' ').trim(),
      cleanedText: buffer.map(s => s.cleanedText).join(' ').replace(/\s+/g, ' ').trim(),
    };
    merged.push(mergedSegment);
  }
  
  return merged;
}
