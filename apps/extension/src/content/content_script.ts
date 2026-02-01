/**
 * Pauser Button Script
 * 
 * Injects a persistent "Open with Pauser" button under YouTube videos.
 * - Always visible: Button persists below video title
 * - Non-intrusive: Styled to match YouTube's native buttons
 * - TOS Compliant: Uses official YouTube IFrame API, doesn't modify player
 */

// ============================================================================
// Types
// ============================================================================

interface PauserPayload {
  videoId: string;
  time: number;
}

// ============================================================================
// Constants
// ============================================================================

const BUTTON_ID = 'pauser-open-button';
const BUTTON_CONTAINER_ID = 'pauser-button-container';

// ============================================================================
// UI Utilities
// ============================================================================

function createPauserButton(videoId: string): HTMLElement {
  // Container for the button (matches YouTube's button styling)
  const container = document.createElement('div');
  container.id = BUTTON_CONTAINER_ID;
  container.style.cssText = `
    display: inline-flex;
    align-items: center;
    margin-right: 8px;
  `;

  // Button element
  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.setAttribute('aria-label', 'Open with Pauser');
  
  // Style to match YouTube's native buttons (like "Edit with edpuzzle")
  button.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background-color: #3B4BD8;
    color: #ffffff;
    border: none;
    border-radius: 18px;
    font-family: "Roboto", "Arial", sans-serif;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  `;

  // Pauser icon (simple focus icon)
  const icon = document.createElement('span');
  icon.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none"/>
      <circle cx="12" cy="12" r="3" fill="currentColor"/>
    </svg>
  `;
  icon.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
  `;

  // Button text
  const text = document.createElement('span');
  text.textContent = 'Open with Pauser';

  button.appendChild(icon);
  button.appendChild(text);

  // Hover effect
  button.addEventListener('mouseenter', () => {
    button.style.backgroundColor = '#6E5AF2';
    button.style.transform = 'translateY(-1px)';
    button.style.boxShadow = '0 2px 8px rgba(59, 75, 216, 0.3)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.backgroundColor = '#3B4BD8';
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = 'none';
  });

  // Active state
  button.addEventListener('mousedown', () => {
    button.style.transform = 'scale(0.98)';
  });

  button.addEventListener('mouseup', () => {
    button.style.transform = 'translateY(-1px)';
  });

  // Click handler
  button.onclick = () => {
    const video = document.querySelector('video.html5-main-video') as HTMLVideoElement;
    const time = video ? Math.floor(video.currentTime) : 0;
    
    chrome.runtime.sendMessage({
      type: 'OPEN_PAUSER',
      payload: { videoId, time }
    });
  };

  container.appendChild(button);
  return container;
}

function removeButton() {
  const existing = document.getElementById(BUTTON_CONTAINER_ID);
  if (existing) {
    existing.remove();
  }
}

// ============================================================================
// Injection Logic
// ============================================================================

function injectButton() {
  const videoId = getVideoIdFromUrl();
  if (!videoId) return;

  // Remove existing button if present
  removeButton();

  // Find injection point - below video, above description
  // YouTube's structure: #above-the-fold contains video title and buttons
  const targetContainer = findButtonContainer();
  
  if (!targetContainer) {
    console.warn('[Pauser] Could not find button container, retrying...');
    setTimeout(injectButton, 500);
    return;
  }

  const button = createPauserButton(videoId);
  
  // Insert at the beginning of the container (leftmost position)
  targetContainer.insertBefore(button, targetContainer.firstChild);
}

function findButtonContainer(): HTMLElement | null {
  // Try multiple selectors for different YouTube layouts
  const selectors = [
    // Desktop: Below video title, where "Edit with..." buttons appear
    '#above-the-fold #top-row #menu-container',
    '#above-the-fold #top-row #menu',
    // Alternative: Below video player
    '#below #above-the-fold #top-row',
    // Fallback: Any container in the top row
    'ytd-watch-metadata #top-row',
  ];

  for (const selector of selectors) {
    const container = document.querySelector(selector) as HTMLElement;
    if (container) {
      return container;
    }
  }

  return null;
}

// ============================================================================
// Utility Functions
// ============================================================================

function getVideoIdFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

function isWatchPage(): boolean {
  return window.location.pathname.includes('/watch');
}

// ============================================================================
// Initialization & Navigation Handling
// ============================================================================

import { TranscriptService } from './transcript';
import type { TranscriptSegment } from '@pauser/common';

/**
 * Detect checkpoints in video segments via API
 */
async function detectCheckpointsInVideo(videoId: string, segments: TranscriptSegment[]) {
  console.log(`[Pauser] Detecting checkpoints for ${videoId}`);
  try {
    const response = await fetch('http://localhost:3000/api/checkpoints/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, segments })
    });
    
    if (response.ok) {
        const data = await response.json();
        console.log(`[Pauser] Checkpoints detected:`, data.checkpoints.length);
        
        // Broadcast to Side Panel / Background
        data.checkpoints.forEach((cp: any) => {
            chrome.runtime.sendMessage({
                type: 'NEW_CHECKPOINT',
                payload: cp
            }).catch(() => {});
        });
    }
  } catch (e) {
    console.error('[Pauser] API call failed:', e);
  }
}

/** Track the last video ID we extracted transcript for */
let lastTranscriptVideoId: string | null = null;

/**
 * Start transcript extraction for the current video
 */
async function extractTranscriptForVideo(videoId: string) {
  // Don't re-extract for the same video
  if (lastTranscriptVideoId === videoId) {
    return;
  }
  
  lastTranscriptVideoId = videoId;
  
  try {
    const transcriptService = TranscriptService.getInstance();
    
    console.log(`[Pauser] Starting transcript extraction for video: ${videoId}`);
    
    const result = await transcriptService.extractTranscript(videoId);
    
    console.log(`[Pauser] Transcript extraction complete:`, {
      status: result.status,
      segmentCount: result.segments.length,
      layer: result.extractionLayer,
      isAutoGenerated: result.metadata?.isAutoGenerated,
    });
    
    // Notify background service of transcript availability
    chrome.runtime.sendMessage({
      type: 'TRANSCRIPT_READY',
      payload: {
        videoId,
        status: result.status,
        segmentCount: result.segments.length,
        isAutoGenerated: result.metadata?.isAutoGenerated || false,
        language: result.metadata?.language || 'Unknown',
      }
    }).catch(() => {
      // Background script might not be ready, that's okay
    });

    // Start Checkpoint Detection
    if (result.status === 'READY') {
      detectCheckpointsInVideo(videoId, result.segments);
    }

  } catch (error) {
    console.error('[Pauser] Transcript extraction failed:', error);
    
    chrome.runtime.sendMessage({
      type: 'TRANSCRIPT_ERROR',
      payload: {
        videoId,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }).catch(() => {});
  }
}

function initialize() {
  if (!isWatchPage()) return;

  // Wait for YouTube's dynamic content to load
  const checkAndInject = () => {
    const video = document.querySelector('video.html5-main-video');
    if (video) {
      injectButton();
      
      // Start transcript extraction (non-blocking)
      const videoId = getVideoIdFromUrl();
      if (videoId) {
        // Small delay to ensure page is fully loaded
        setTimeout(() => {
          extractTranscriptForVideo(videoId);
        }, 1000);
      }
    } else {
      setTimeout(checkAndInject, 500);
    }
  };

  checkAndInject();
}

// Listen for YouTube SPA navigation
document.addEventListener('yt-navigate-finish', () => {
  removeButton();
  lastTranscriptVideoId = null; // Reset for new video
  initialize();
});

// Handle initial page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Use MutationObserver to handle YouTube's dynamic DOM updates
const observer = new MutationObserver((mutations) => {
  // Check if button was removed by YouTube
  if (isWatchPage() && !document.getElementById(BUTTON_CONTAINER_ID)) {
    const videoId = getVideoIdFromUrl();
    if (videoId) {
      // Re-inject button if it was removed
      setTimeout(injectButton, 100);
    }
  }
});

// Observe the entire document for changes
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Listen for transcript requests from popup or background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_TRANSCRIPT') {
    const videoId = message.payload?.videoId || getVideoIdFromUrl();
    
    if (!videoId) {
      sendResponse({ error: 'No video ID' });
      return true;
    }
    
    const transcriptService = TranscriptService.getInstance();
    const cached = transcriptService.getCachedResult(videoId);
    
    if (cached) {
      sendResponse({ result: cached });
    } else {
      // Start extraction and respond when complete
      transcriptService.extractTranscript(videoId).then(result => {
        sendResponse({ result });
      }).catch(error => {
        sendResponse({ error: error.message });
      });
      return true; // Async response
    }
  }
  
  if (message.type === 'GET_TRANSCRIPT_STATUS') {
    const videoId = message.payload?.videoId || getVideoIdFromUrl();
    
    if (!videoId) {
      sendResponse({ status: 'error', error: 'No video ID' });
      return true;
    }
    
    const transcriptService = TranscriptService.getInstance();
    const status = transcriptService.getStatus(videoId);
    sendResponse({ status });
  }
  
  if (message.type === 'GET_TRANSCRIPT_TEXT') {
    const videoId = message.payload?.videoId || getVideoIdFromUrl();
    const startTime = message.payload?.startTime;
    const endTime = message.payload?.endTime;
    
    if (!videoId) {
      sendResponse({ error: 'No video ID' });
      return true;
    }
    
    const transcriptService = TranscriptService.getInstance();
    
    if (startTime !== undefined && endTime !== undefined) {
      const segments = transcriptService.getSegmentsInRange(videoId, startTime, endTime);
      sendResponse({ segments });
    } else {
      const text = transcriptService.getFullText(videoId);
      sendResponse({ text });
    }
  }
  
  return true;
});
