/**
 * Video Segmenter
 *
 * Strategies:
 * 1. YouTube Chapters (Primary, High Quality)
 * 2. Time-Based Fixed Intervals (Fallback, Deterministic)
 */

import { VideoChapter, VideoSegment, SegmentationConfig, DEFAULT_SEGMENTATION_CONFIG } from './types';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Seconds to H:M:S string
 */
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Parse timestamp string (H:M:S or M:S) to seconds.
 */
export function parseTimestamp(timestamp: string): number | null {
  const parts = timestamp.split(':').map(Number);
  if (parts.some(isNaN)) return null;

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return null;
}

// ============================================================================
// Strategies
// ============================================================================

/**
 * Parse YouTube chapters from video description.
 * Format: "00:00 Intro" or "Intro 0:00"
 */
export function parseYouTubeChapters(description: string): VideoChapter[] {
  const chapters: VideoChapter[] = [];
  const lines = description.split('\n');
  
  // Regex for MM:SS or HH:MM:SS at start or end of line
  const timeRegex = /(\d{1,2}:\d{2}(?::\d{2})?)/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = timeRegex.exec(trimmed);
    if (match) {
      const timeStr = match[1];
      const seconds = parseTimestamp(timeStr);
      
      if (seconds !== null) {
        // Remove timestamp from title
        let title = trimmed.replace(timeStr, '').trim();
        // Remove punctuation separators often found e.g. "00:00 - Intro"
        title = title.replace(/^[-–—|]\s*/, '').replace(/\s*[-–—|]$/, '');
        
        if (title) {
          chapters.push({ startTime: seconds, title });
        }
      }
    }
  }

  // Sort by start time just in case
  return chapters.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Create segments based on parsed chapters.
 */
export function segmentByChapters(
  chapters: VideoChapter[],
  totalDuration: number,
  transcriptFull: string
): VideoSegment[] {
  const segments: VideoSegment[] = [];

  for (let i = 0; i < chapters.length; i++) {
    const current = chapters[i];
    const next = chapters[i + 1];
    
    // End time is start of next chapter, or end of video
    const endTime = next ? next.startTime : totalDuration;
    
    // Sanity check
    if (endTime <= current.startTime) continue;

    // TODO: Slice transcript based on time offsets
    // For now, we approximate or leave empty to be filled by Transcript Aligner
    const transcriptChunk = ""; 

    segments.push({
      startTime: current.startTime,
      endTime,
      title: current.title,
      transcriptChunk,
      concepts: [],
    });
  }

  return segments;
}

/**
 * Create fixed-interval segments (Fallback).
 */
export function segmentByTime(
  totalDuration: number,
  config: SegmentationConfig = DEFAULT_SEGMENTATION_CONFIG
): VideoSegment[] {
  const segments: VideoSegment[] = [];
  const interval = config.fallbackIntervalSeconds;
  
  for (let start = 0; start < totalDuration; start += interval) {
    const end = Math.min(start + interval, totalDuration);
    
    // Avoid tiny last segment
    if (end - start < config.minSegmentSeconds) {
       if (segments.length > 0) {
         // Merge into previous
         segments[segments.length - 1].endTime = end;
       } else {
         // Only one segment
         segments.push({
           startTime: start,
           endTime: end,
           title: `Part 1`,
           transcriptChunk: "",
           concepts: []
         });
       }
       continue;
    }

    const partNum = Math.floor(start / interval) + 1;
    segments.push({
      startTime: start,
      endTime: end,
      title: `Part ${partNum} (${formatTime(start)} - ${formatTime(end)})`,
      transcriptChunk: "",
      concepts: [],
    });
  }

  return segments;
}

// ============================================================================
// Main Segmenter
// ============================================================================

/**
 * Main entry point for segmentation.
 */
export function segmentVideo(
  duration: number,
  description?: string,
  transcript?: string,
  config: SegmentationConfig = DEFAULT_SEGMENTATION_CONFIG
): VideoSegment[] {
  // Strategy 1: Chapters
  if (config.preferChapters && description) {
    const chapters = parseYouTubeChapters(description);
    if (chapters.length > 0) {
      return segmentByChapters(chapters, duration, transcript || "");
    }
  }

  // Strategy 2: Time-based Fallback
  return segmentByTime(duration, config);
}
