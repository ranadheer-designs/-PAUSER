/**
 * XML Caption Parser
 * 
 * Parses YouTube's XML caption format into TranscriptSegments.
 * 
 * YouTube XML format:
 * <transcript>
 *   <text start="0.5" dur="2.3">Hello world</text>
 *   <text start="2.8" dur="1.5">This is a subtitle</text>
 * </transcript>
 */

import type { TranscriptSegment } from '@pauser/common';
import { normalizeText, lightNormalize } from './normalizeText';

/**
 * Parse XML caption string into transcript segments
 */
export function parseXMLCaptions(xmlString: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  
  if (!xmlString || typeof xmlString !== 'string') {
    return segments;
  }
  
  try {
    // Use DOMParser for robust XML parsing
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');
    
    // Check for parsing errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      console.warn('[Pauser] XML parsing error, falling back to regex');
      return parseXMLWithRegex(xmlString);
    }
    
    // Extract all text elements
    const textElements = doc.querySelectorAll('text');
    
    textElements.forEach((element) => {
      const startAttr = element.getAttribute('start');
      const durAttr = element.getAttribute('dur');
      const rawText = element.textContent || '';
      
      if (startAttr !== null) {
        const startTime = parseFloat(startAttr);
        const duration = durAttr ? parseFloat(durAttr) : 0;
        const endTime = startTime + duration;
        
        // Skip empty segments
        const cleanedText = normalizeText(rawText);
        if (cleanedText.length === 0) {
          return;
        }
        
        segments.push({
          startTime,
          endTime,
          rawText: lightNormalize(rawText),
          cleanedText,
        });
      }
    });
  } catch (error) {
    console.error('[Pauser] Error parsing XML captions:', error);
    // Fallback to regex parsing
    return parseXMLWithRegex(xmlString);
  }
  
  return segments;
}

/**
 * Fallback regex-based XML parser
 * Used when DOMParser fails (e.g., malformed XML)
 */
function parseXMLWithRegex(xmlString: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  
  // Match <text start="X" dur="Y">content</text>
  const regex = /<text\s+start="([\d.]+)"(?:\s+dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/gi;
  
  let match;
  while ((match = regex.exec(xmlString)) !== null) {
    const startTime = parseFloat(match[1]);
    const duration = match[2] ? parseFloat(match[2]) : 0;
    const rawText = match[3];
    
    const cleanedText = normalizeText(rawText);
    if (cleanedText.length === 0) {
      continue;
    }
    
    segments.push({
      startTime,
      endTime: startTime + duration,
      rawText: lightNormalize(rawText),
      cleanedText,
    });
  }
  
  return segments;
}

/**
 * Merge adjacent segments that are very close together
 * Useful for cleaning up overly fragmented captions
 */
export function mergeCloseSegments(
  segments: TranscriptSegment[],
  maxGapSeconds: number = 0.1
): TranscriptSegment[] {
  if (segments.length === 0) return [];
  
  const merged: TranscriptSegment[] = [];
  let current = { ...segments[0] };
  
  for (let i = 1; i < segments.length; i++) {
    const next = segments[i];
    const gap = next.startTime - current.endTime;
    
    // If segments are very close, merge them
    if (gap <= maxGapSeconds) {
      current.endTime = next.endTime;
      current.rawText += ' ' + next.rawText;
      current.cleanedText += ' ' + next.cleanedText;
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  
  merged.push(current);
  return merged;
}
