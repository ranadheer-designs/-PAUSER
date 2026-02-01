/**
 * Injected Script for Page Context Access
 * 
 * This script runs in the page context (not content script sandbox)
 * to access YouTube's internal player data.
 * 
 * IMPORTANT: This file is injected into the page and runs outside
 * the extension sandbox. It communicates via CustomEvents.
 */

// Self-executing function to avoid polluting global scope
(function() {
  'use strict';
  
  // Prevent multiple injections
  if (window.__pauserInjected) {
    return;
  }
  window.__pauserInjected = true;
  
  /**
   * Extract caption tracks from player response
   */
  function extractCaptionData() {
    try {
      // Try to get ytInitialPlayerResponse
      const playerResponse = window.ytInitialPlayerResponse;
      
      if (!playerResponse) {
        return null;
      }
      
      const captions = playerResponse.captions;
      const captionTracks = captions?.playerCaptionsTracklistRenderer?.captionTracks || null;
      const videoDetails = playerResponse.videoDetails || null;
      
      return {
        captionTracks: captionTracks,
        videoId: videoDetails?.videoId || null,
        videoTitle: videoDetails?.title || null,
        videoDuration: videoDetails?.lengthSeconds ? parseInt(videoDetails.lengthSeconds, 10) : null,
      };
    } catch (e) {
      console.error('[Pauser Injected] Error extracting player data:', e);
      return null;
    }
  }
  
  /**
   * Try to extract from ytplayer.config if available
   */
  function extractFromYtPlayer() {
    try {
      const ytplayer = window.ytplayer;
      if (!ytplayer || !ytplayer.config || !ytplayer.config.args) {
        return null;
      }
      
      const args = ytplayer.config.args;
      if (args.player_response) {
        const playerResponse = JSON.parse(args.player_response);
        const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || null;
        
        return {
          captionTracks: captionTracks,
          videoId: args.video_id || null,
          videoTitle: args.title || null,
          videoDuration: args.length_seconds ? parseInt(args.length_seconds, 10) : null,
        };
      }
    } catch (e) {
      // Fallback failed
    }
    return null;
  }
  
  /**
   * Send data to content script via CustomEvent
   */
  function sendToContentScript(data) {
    window.dispatchEvent(new CustomEvent('pauser-player-data', {
      detail: data
    }));
  }
  
  /**
   * Main extraction logic
   */
  function extract() {
    let data = extractCaptionData();
    
    if (!data) {
      data = extractFromYtPlayer();
    }
    
    if (data) {
      sendToContentScript(data);
    } else {
      // Send empty response to indicate extraction was attempted
      sendToContentScript({
        captionTracks: null,
        videoId: null,
        videoTitle: null,
        videoDuration: null,
        error: 'Could not find player data',
      });
    }
  }
  
  // Run extraction
  extract();
  
  // Also listen for requests from content script
  window.addEventListener('pauser-request-player-data', function() {
    extract();
  });
  
  console.log('[Pauser] Injected script loaded');
})();
