/**
 * Layer 4: DOM-Based Fallback
 * 
 * Last resort extraction method.
 * Opens the transcript panel and scrapes segments from the DOM.
 * 
 * This is slower and more fragile but works when direct API access fails.
 */

import type { TranscriptSegment, TranscriptResult, TranscriptMetadata } from '@pauser/common';
import { TranscriptStatus, ExtractionLayer } from '@pauser/common';
import { normalizeText, parseTimestamp } from '../utils';

/**
 * Configuration for DOM extraction
 */
const DOM_CONFIG = {
  /** Maximum time to wait for transcript panel to open */
  PANEL_OPEN_TIMEOUT: 5000,
  /** Maximum time to wait for segments to load */
  SEGMENTS_LOAD_TIMEOUT: 10000,
  /** Delay between scroll actions */
  SCROLL_DELAY: 100,
  /** Maximum scroll attempts */
  MAX_SCROLL_ATTEMPTS: 100,
};

/**
 * Selectors for transcript panel elements
 * Multiple selectors for resilience to YouTube UI changes
 */
const SELECTORS = {
  // Menu button (three dots)
  menuButton: [
    'button.ytp-button[aria-label*="More actions"]',
    '#movie_player .ytp-chrome-bottom button[aria-label*="More"]',
    'ytd-menu-renderer button[aria-label*="Actions"]',
  ],
  // Transcript menu item
  transcriptMenuItem: [
    'ytd-menu-service-item-renderer:has-text("Show transcript")',
    'tp-yt-paper-listbox ytd-menu-service-item-renderer yt-formatted-string:contains("transcript")',
    '[role="menuitem"]:has-text("transcript")',
  ],
  // Engagement panel (where transcript appears)
  transcriptPanel: [
    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]',
    '#panels ytd-transcript-renderer',
    'ytd-transcript-search-panel-renderer',
  ],
  // Segment container
  segmentContainer: [
    'ytd-transcript-segment-list-renderer',
    'ytd-transcript-renderer #content',
  ],
  // Individual segment
  segment: [
    'ytd-transcript-segment-renderer',
    '.ytd-transcript-segment-renderer',
  ],
  // Timestamp within segment
  timestamp: [
    '.segment-timestamp',
    'div.segment-timestamp',
  ],
  // Text within segment
  text: [
    '.segment-text',
    'yt-formatted-string.segment-text',
  ],
  // Show transcript button (alternative path)
  showTranscriptButton: [
    'button[aria-label="Show transcript"]',
    '#description ytd-video-description-transcript-section-renderer button',
  ],
};

/**
 * Try multiple selectors until one matches
 */
function queryWithFallbacks(selectors: string[], parent: Element | Document = document): Element | null {
  for (const selector of selectors) {
    try {
      const element = parent.querySelector(selector);
      if (element) return element;
    } catch (e) {
      // Invalid selector, continue to next
    }
  }
  return null;
}

/**
 * Try multiple selectors and return all matches
 */
function queryAllWithFallbacks(selectors: string[], parent: Element | Document = document): Element[] {
  for (const selector of selectors) {
    try {
      const elements = parent.querySelectorAll(selector);
      if (elements.length > 0) return Array.from(elements);
    } catch (e) {
      // Invalid selector, continue to next
    }
  }
  return [];
}

/**
 * Wait for an element to appear in the DOM
 */
function waitForElement(selectors: string[], timeout: number = 5000): Promise<Element | null> {
  return new Promise((resolve) => {
    // Check immediately
    const existing = queryWithFallbacks(selectors);
    if (existing) {
      resolve(existing);
      return;
    }
    
    const observer = new MutationObserver(() => {
      const element = queryWithFallbacks(selectors);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    
    // Timeout
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

/**
 * Click the "Show transcript" button via description section
 */
async function openTranscriptViaDescription(): Promise<boolean> {
  const button = queryWithFallbacks(SELECTORS.showTranscriptButton);
  if (button && button instanceof HTMLElement) {
    button.click();
    return true;
  }
  return false;
}

/**
 * Click through menu to open transcript panel
 */
async function openTranscriptViaMenu(): Promise<boolean> {
  // This is complex and often blocked by YouTube's event handling
  // For now, return false to indicate we should try other methods
  return false;
}

/**
 * Try to open the transcript panel
 */
async function openTranscriptPanel(): Promise<Element | null> {
  // Check if already open
  let panel = queryWithFallbacks(SELECTORS.transcriptPanel);
  if (panel) {
    return panel;
  }
  
  // Try description button first (most reliable)
  const openedViaDesc = await openTranscriptViaDescription();
  if (openedViaDesc) {
    panel = await waitForElement(SELECTORS.transcriptPanel, DOM_CONFIG.PANEL_OPEN_TIMEOUT);
    if (panel) return panel;
  }
  
  // Try menu (less reliable)
  const openedViaMenu = await openTranscriptViaMenu();
  if (openedViaMenu) {
    panel = await waitForElement(SELECTORS.transcriptPanel, DOM_CONFIG.PANEL_OPEN_TIMEOUT);
    if (panel) return panel;
  }
  
  return null;
}

/**
 * Scroll the transcript panel to load all segments
 * YouTube virtualizes the list, so we need to scroll to load all content
 */
async function scrollToLoadAllSegments(container: Element): Promise<void> {
  return new Promise((resolve) => {
    let lastHeight = 0;
    let attempts = 0;
    
    const scroll = () => {
      const scrollable = container.querySelector('[style*="overflow"]') || container;
      
      if (scrollable instanceof HTMLElement) {
        scrollable.scrollTop = scrollable.scrollHeight;
        
        const newHeight = scrollable.scrollHeight;
        
        if (newHeight === lastHeight || attempts >= DOM_CONFIG.MAX_SCROLL_ATTEMPTS) {
          // Reset scroll position
          scrollable.scrollTop = 0;
          resolve();
          return;
        }
        
        lastHeight = newHeight;
        attempts++;
        setTimeout(scroll, DOM_CONFIG.SCROLL_DELAY);
      } else {
        resolve();
      }
    };
    
    scroll();
  });
}

/**
 * Extract segments from loaded DOM
 */
function extractSegmentsFromDOM(container: Element): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const segmentElements = queryAllWithFallbacks(SELECTORS.segment, container);
  
  for (const element of segmentElements) {
    const timestampEl = queryWithFallbacks(SELECTORS.timestamp, element);
    const textEl = queryWithFallbacks(SELECTORS.text, element);
    
    if (!timestampEl || !textEl) continue;
    
    const timestampText = timestampEl.textContent?.trim() || '';
    const rawText = textEl.textContent || '';
    
    const startTime = parseTimestamp(timestampText);
    const cleanedText = normalizeText(rawText);
    
    if (cleanedText.length === 0) continue;
    
    segments.push({
      startTime,
      endTime: startTime, // Will be corrected below
      rawText: rawText.trim(),
      cleanedText,
    });
  }
  
  // Calculate end times based on next segment's start
  for (let i = 0; i < segments.length - 1; i++) {
    segments[i].endTime = segments[i + 1].startTime;
  }
  
  // Last segment: estimate 3 seconds duration
  if (segments.length > 0) {
    const last = segments[segments.length - 1];
    last.endTime = last.startTime + 3;
  }
  
  return segments;
}

/**
 * Get video ID from URL
 */
function getVideoIdFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

/**
 * Layer 4: Extract transcript from DOM (fallback)
 */
export async function extractFromDOM(): Promise<TranscriptResult> {
  console.log('[Pauser] Layer 4: Attempting DOM-based extraction...');
  
  const videoId = getVideoIdFromUrl();
  
  if (!videoId) {
    return {
      status: TranscriptStatus.ERROR,
      segments: [],
      metadata: null,
      error: 'Could not determine video ID',
      extractionLayer: ExtractionLayer.DOM_FALLBACK,
    };
  }
  
  try {
    // Try to open transcript panel
    const panel = await openTranscriptPanel();
    
    if (!panel) {
      console.log('[Pauser] Layer 4: Could not open transcript panel');
      return {
        status: TranscriptStatus.UNAVAILABLE,
        segments: [],
        metadata: null,
        error: 'Could not open transcript panel',
        extractionLayer: ExtractionLayer.DOM_FALLBACK,
      };
    }
    
    // Wait for segment container
    const container = await waitForElement(SELECTORS.segmentContainer, DOM_CONFIG.SEGMENTS_LOAD_TIMEOUT);
    
    if (!container) {
      return {
        status: TranscriptStatus.UNAVAILABLE,
        segments: [],
        metadata: null,
        error: 'Transcript container not found',
        extractionLayer: ExtractionLayer.DOM_FALLBACK,
      };
    }
    
    // Scroll to load all segments
    await scrollToLoadAllSegments(container);
    
    // Extract segments
    const segments = extractSegmentsFromDOM(container);
    
    if (segments.length === 0) {
      return {
        status: TranscriptStatus.UNAVAILABLE,
        segments: [],
        metadata: null,
        error: 'No transcript segments found in DOM',
        extractionLayer: ExtractionLayer.DOM_FALLBACK,
      };
    }
    
    const lastSegment = segments[segments.length - 1];
    
    const metadata: TranscriptMetadata = {
      videoId,
      language: 'Unknown', // Can't reliably detect from DOM
      languageCode: 'en', // Assume English
      isAutoGenerated: false, // Can't reliably detect
      isTranslated: false,
      fetchedAt: Date.now(),
      totalDuration: lastSegment.endTime,
      segmentCount: segments.length,
    };
    
    console.log(`[Pauser] Layer 4: Successfully extracted ${segments.length} segments from DOM`);
    
    return {
      status: TranscriptStatus.READY,
      segments,
      metadata,
      extractionLayer: ExtractionLayer.DOM_FALLBACK,
    };
  } catch (error) {
    console.error('[Pauser] Layer 4 extraction failed:', error);
    return {
      status: TranscriptStatus.ERROR,
      segments: [],
      metadata: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      extractionLayer: ExtractionLayer.DOM_FALLBACK,
    };
  }
}
