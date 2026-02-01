/**
 * Layer 2: Player Data Inspection
 * 
 * Fallback when Layer 1 fails - directly inspects page HTML
 * for ytInitialPlayerResponse embedded in script tags.
 */

import type { TranscriptResult, CaptionTrack } from '@pauser/common';
import { TranscriptStatus, ExtractionLayer } from '@pauser/common';
import { extractFromCaptionEndpoint } from './Layer1CaptionEndpoint';

/**
 * Extract ytInitialPlayerResponse from page scripts
 * This is a fallback when the injected script method fails
 */
function extractPlayerResponseFromPage(): { captionTracks: CaptionTrack[] | null; videoId: string | null } {
  const scripts = document.querySelectorAll('script');
  
  for (const script of scripts) {
    const content = script.textContent || '';
    
    // Look for ytInitialPlayerResponse
    const match = content.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
    if (match) {
      try {
        const playerResponse = JSON.parse(match[1]);
        const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null;
        const videoId = playerResponse?.videoDetails?.videoId || null;
        
        return { captionTracks, videoId };
      } catch (e) {
        console.warn('[Pauser] Failed to parse ytInitialPlayerResponse:', e);
      }
    }
    
    // Also try ytInitialData for some video types
    const dataMatch = content.match(/var\s+ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
    if (dataMatch) {
      try {
        const playerResponse = JSON.parse(dataMatch[1]);
        const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null;
        const videoId = playerResponse?.videoDetails?.videoId || null;
        
        return { captionTracks, videoId };
      } catch (e) {
        // Continue to next script
      }
    }
  }
  
  return { captionTracks: null, videoId: null };
}

/**
 * Try to extract caption tracks from yt-player-response element
 * YouTube sometimes includes this in the DOM
 */
function extractFromPlayerElement(): { captionTracks: CaptionTrack[] | null; videoId: string | null } {
  // Check for player response in DOM element
  const playerResponseEl = document.querySelector('#player-response');
  if (playerResponseEl) {
    const content = playerResponseEl.textContent || '';
    try {
      const data = JSON.parse(content);
      const captionTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null;
      const videoId = data?.videoDetails?.videoId || null;
      return { captionTracks, videoId };
    } catch (e) {
      // Not valid JSON
    }
  }
  
  return { captionTracks: null, videoId: null };
}

/**
 * Extract from YouTube's modern config object
 */
function extractFromYTConfig(): { captionTracks: CaptionTrack[] | null; videoId: string | null } {
  // YouTube sometimes exposes ytcfg
  const scripts = document.querySelectorAll('script');
  
  for (const script of scripts) {
    const content = script.textContent || '';
    
    // Look for embedded player response in various formats
    const patterns = [
      /"captionTracks":\s*(\[.+?\])/s,
      /playerCaptionsTracklistRenderer['"]\s*:\s*\{[^}]*['"]captionTracks['"]\s*:\s*(\[.+?\])/s,
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        try {
          const captionTracks = JSON.parse(match[1]);
          // Try to find video ID
          const videoIdMatch = content.match(/"videoId"\s*:\s*"([^"]+)"/);
          const videoId = videoIdMatch ? videoIdMatch[1] : null;
          
          return { captionTracks, videoId };
        } catch (e) {
          // Continue trying other patterns
        }
      }
    }
  }
  
  return { captionTracks: null, videoId: null };
}

/**
 * Get video ID from URL as fallback
 */
function getVideoIdFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

/**
 * Layer 2: Extract transcript by inspecting page data
 */
export async function extractFromPlayerInspection(): Promise<TranscriptResult> {
  console.log('[Pauser] Layer 2: Inspecting page for player data...');
  
  try {
    // Try multiple extraction methods
    let data = extractPlayerResponseFromPage();
    
    if (!data.captionTracks) {
      data = extractFromPlayerElement();
    }
    
    if (!data.captionTracks) {
      data = extractFromYTConfig();
    }
    
    // Get video ID from URL if not found
    const videoId = data.videoId || getVideoIdFromUrl();
    
    if (!videoId) {
      return {
        status: TranscriptStatus.ERROR,
        segments: [],
        metadata: null,
        error: 'Could not determine video ID',
        extractionLayer: ExtractionLayer.PLAYER_INSPECTION,
      };
    }
    
    if (!data.captionTracks || data.captionTracks.length === 0) {
      console.log('[Pauser] Layer 2: No caption tracks found in page data');
      return {
        status: TranscriptStatus.UNAVAILABLE,
        segments: [],
        metadata: null,
        error: 'No caption tracks found in page data',
        extractionLayer: ExtractionLayer.PLAYER_INSPECTION,
      };
    }
    
    console.log(`[Pauser] Layer 2: Found ${data.captionTracks.length} caption tracks`);
    
    // Use Layer 1's extraction logic with the found tracks
    const result = await extractFromCaptionEndpoint(data.captionTracks, videoId);
    
    // Update extraction layer to reflect this was Layer 2
    return {
      ...result,
      extractionLayer: ExtractionLayer.PLAYER_INSPECTION,
    };
  } catch (error) {
    console.error('[Pauser] Layer 2 extraction failed:', error);
    return {
      status: TranscriptStatus.ERROR,
      segments: [],
      metadata: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      extractionLayer: ExtractionLayer.PLAYER_INSPECTION,
    };
  }
}
