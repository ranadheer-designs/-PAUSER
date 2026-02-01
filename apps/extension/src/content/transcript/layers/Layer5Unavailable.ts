/**
 * Layer 5: No Transcript Available
 * 
 * Final fallback when no captions exist.
 * Returns a clear unavailable state.
 */

import type { TranscriptResult } from '@pauser/common';
import { TranscriptStatus, ExtractionLayer } from '@pauser/common';

/**
 * Get video ID from URL
 */
function getVideoIdFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

/**
 * Layer 5: Return unavailable state
 */
export function handleNoTranscript(reason?: string): TranscriptResult {
  const videoId = getVideoIdFromUrl();
  
  console.log(`[Pauser] Layer 5: No transcript available for video ${videoId}`);
  
  return {
    status: TranscriptStatus.UNAVAILABLE,
    segments: [],
    metadata: null,
    error: reason || 'No transcript available for this video',
    extractionLayer: ExtractionLayer.UNAVAILABLE,
  };
}

/**
 * Check if transcript is truly unavailable
 * This can be called to verify after all layers have failed
 */
export function isTranscriptUnavailable(): boolean {
  // Check for YouTube's "Transcript" button in description
  const transcriptButton = document.querySelector(
    'ytd-video-description-transcript-section-renderer'
  );
  
  // If there's no transcript button at all, captions are unavailable
  if (!transcriptButton) {
    return true;
  }
  
  // Check if "subtitles/closed captions" is mentioned in player settings
  const settingsButton = document.querySelector('button.ytp-settings-button');
  if (!settingsButton) {
    return true;
  }
  
  // If we can't conclusively determine, assume potentially available
  // and let other layers handle it
  return false;
}
