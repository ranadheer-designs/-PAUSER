/**
 * Checkpoint Types
 */

export interface VideoChapter {
  title: string;
  startTime: number;
}

export interface VideoSegment {
  startTime: number;
  endTime: number;
  title: string;
  transcriptChunk: string;
  concepts: string[];
}

export interface SegmentationConfig {
  /**
   * If true, try to use chapters from description first.
   * @default true
   */
  preferChapters: boolean;

  /**
   * Interval for time-based segmentation if chapters fail.
   * @default 300 (5 minutes)
   */
  fallbackIntervalSeconds: number;

  /**
   * Minimum segment duration to avoid tiny chunks.
   * @default 60
   */
  minSegmentSeconds: number;

  /**
   * Maximum segment duration to force split.
   * @default 900 (15 minutes)
   */
  maxSegmentSeconds: number;
}

export const DEFAULT_SEGMENTATION_CONFIG: SegmentationConfig = {
  preferChapters: true,
  fallbackIntervalSeconds: 300,
  minSegmentSeconds: 60,
  maxSegmentSeconds: 900,
};

export interface ExtractorConfig {
  /**
   * Dictionary of concepts to match against.
   * Key: Concept name, Value: Related keywords
   */
  dictionary: Record<string, string[]>;

  /**
   * Confidence threshold for AI extraction.
   * @default 0.7
   */
  aiConfidenceThreshold?: number;
}
