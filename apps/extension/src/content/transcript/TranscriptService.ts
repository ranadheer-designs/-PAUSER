/**
 * TranscriptService
 * 
 * Main service for YouTube transcript extraction.
 * Implements a multi-layer extraction strategy with caching.
 * 
 * Usage:
 *   const service = TranscriptService.getInstance();
 *   const result = await service.extractTranscript(videoId);
 */

import type { 
  TranscriptResult, 
  TranscriptSegment,
  CaptionTrack,
} from '@pauser/common';
import { 
  TranscriptStatus, 
  ExtractionLayer,
} from '@pauser/common';
import {
  extractFromCaptionEndpoint,
  extractFromPlayerInspection,
  extractWithAutoProcessing,
  extractFromDOM,
  handleNoTranscript,
  type PlayerDataMessage,
} from './layers';

// ============================================================================
// Types
// ============================================================================

interface CacheEntry {
  result: TranscriptResult;
  timestamp: number;
}

interface PendingExtraction {
  promise: Promise<TranscriptResult>;
  videoId: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Cache duration in milliseconds (30 minutes) */
const CACHE_DURATION_MS = 30 * 60 * 1000;

/** Timeout for waiting for player data from injected script */
const PLAYER_DATA_TIMEOUT_MS = 3000;

// ============================================================================
// TranscriptService
// ============================================================================

export class TranscriptService {
  private static instance: TranscriptService | null = null;
  
  /** Cache of extracted transcripts by video ID */
  private cache: Map<string, CacheEntry> = new Map();
  
  /** Currently pending extraction (to avoid duplicate requests) */
  private pendingExtraction: PendingExtraction | null = null;
  
  /** Listener cleanup function */
  private cleanupListener: (() => void) | null = null;
  
  /** Last received player data */
  private playerData: PlayerDataMessage | null = null;
  
  private constructor() {
    this.setupPlayerDataListener();
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): TranscriptService {
    if (!TranscriptService.instance) {
      TranscriptService.instance = new TranscriptService();
    }
    return TranscriptService.instance;
  }
  
  /**
   * Reset the singleton (for testing)
   */
  static resetInstance(): void {
    if (TranscriptService.instance) {
      TranscriptService.instance.cleanup();
      TranscriptService.instance = null;
    }
  }
  
  // ============================================================================
  // Public API
  // ============================================================================
  
  /**
   * Extract transcript for a video
   * 
   * Tries layers in order:
   * 1. Caption endpoint (via injected script)
   * 2. Player data inspection (parse page HTML)
   * 3. Auto-caption processing
   * 4. DOM fallback (scrape transcript panel)
   * 5. Return unavailable
   */
  async extractTranscript(videoId: string): Promise<TranscriptResult> {
    // Check cache first
    const cached = this.getCachedResult(videoId);
    if (cached) {
      console.log('[Pauser] TranscriptService: Returning cached result');
      return cached;
    }
    
    // Check if extraction is already in progress for this video
    if (this.pendingExtraction && this.pendingExtraction.videoId === videoId) {
      console.log('[Pauser] TranscriptService: Returning pending extraction');
      return this.pendingExtraction.promise;
    }
    
    // Start new extraction
    const extractionPromise = this.performExtraction(videoId);
    this.pendingExtraction = { promise: extractionPromise, videoId };
    
    try {
      const result = await extractionPromise;
      
      // Cache successful results
      if (result.status === TranscriptStatus.READY || result.status === TranscriptStatus.PARTIAL) {
        this.cacheResult(videoId, result);
      }
      
      return result;
    } finally {
      this.pendingExtraction = null;
    }
  }
  
  /**
   * Get current extraction status for a video
   */
  getStatus(videoId: string): TranscriptStatus {
    const cached = this.cache.get(videoId);
    if (cached && !this.isCacheExpired(cached)) {
      return cached.result.status;
    }
    
    if (this.pendingExtraction?.videoId === videoId) {
      return TranscriptStatus.LOADING;
    }
    
    return TranscriptStatus.IDLE;
  }
  
  /**
   * Get cached result for a video (or null if not cached/expired)
   */
  getCachedResult(videoId: string): TranscriptResult | null {
    const cached = this.cache.get(videoId);
    if (cached && !this.isCacheExpired(cached)) {
      return cached.result;
    }
    return null;
  }
  
  /**
   * Clear cache for a specific video or all videos
   */
  clearCache(videoId?: string): void {
    if (videoId) {
      this.cache.delete(videoId);
    } else {
      this.cache.clear();
    }
  }
  
  /**
   * Get transcript segments within a time range
   */
  getSegmentsInRange(videoId: string, startTime: number, endTime: number): TranscriptSegment[] {
    const cached = this.getCachedResult(videoId);
    if (!cached || cached.segments.length === 0) {
      return [];
    }
    
    return cached.segments.filter(segment =>
      segment.startTime >= startTime && segment.startTime < endTime
    );
  }
  
  /**
   * Get segment at a specific time
   */
  getSegmentAtTime(videoId: string, time: number): TranscriptSegment | null {
    const cached = this.getCachedResult(videoId);
    if (!cached || cached.segments.length === 0) {
      return null;
    }
    
    // Find segment containing this time
    return cached.segments.find(segment =>
      time >= segment.startTime && time < segment.endTime
    ) || null;
  }
  
  /**
   * Get all segments as a single text block
   */
  getFullText(videoId: string): string {
    const cached = this.getCachedResult(videoId);
    if (!cached || cached.segments.length === 0) {
      return '';
    }
    
    return cached.segments
      .map(s => s.cleanedText)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  /**
   * Get segments with timestamps formatted for display
   */
  getFormattedTranscript(videoId: string): string {
    const cached = this.getCachedResult(videoId);
    if (!cached || cached.segments.length === 0) {
      return '';
    }
    
    return cached.segments
      .map(s => `[${this.formatTime(s.startTime)}] ${s.cleanedText}`)
      .join('\n');
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  /**
   * Set up listener for player data from injected script
   */
  private setupPlayerDataListener(): void {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<PlayerDataMessage>;
      this.playerData = customEvent.detail;
    };
    
    window.addEventListener('pauser-player-data', handler as EventListener);
    
    this.cleanupListener = () => {
      window.removeEventListener('pauser-player-data', handler as EventListener);
    };
  }
  
  /**
   * Inject script into page context
   */
  private injectScript(): void {
    try {
      // Check if already injected
      if (document.querySelector('script[data-pauser-injected]')) {
        return;
      }
      
      // Create script element
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('injected.js');
      script.setAttribute('data-pauser-injected', 'true');
      
      // Inject into page
      (document.head || document.documentElement).appendChild(script);
      
      // Clean up script tag after injection (script still runs)
      script.onload = () => script.remove();
      script.onerror = () => {
        console.warn('[Pauser] Failed to inject script, will use fallback methods');
        script.remove();
      };
    } catch (e) {
      console.warn('[Pauser] Script injection failed:', e);
    }
  }
  
  /**
   * Request player data by dispatching event and injecting script
   */
  private async requestPlayerData(): Promise<PlayerDataMessage | null> {
    this.playerData = null;
    
    // Inject script to get player data
    this.injectScript();
    
    // Also dispatch request event (in case script is already loaded)
    window.dispatchEvent(new CustomEvent('pauser-request-player-data'));
    
    // Wait for response
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkData = () => {
        if (this.playerData) {
          resolve(this.playerData);
          return;
        }
        
        if (Date.now() - startTime > PLAYER_DATA_TIMEOUT_MS) {
          resolve(null);
          return;
        }
        
        setTimeout(checkData, 100);
      };
      
      checkData();
    });
  }
  
  /**
   * Perform the actual extraction using layered approach
   */
  private async performExtraction(videoId: string): Promise<TranscriptResult> {
    console.log(`[Pauser] TranscriptService: Starting extraction for ${videoId}`);
    
    // Layer 1: Try caption endpoint via injected script
    const playerData = await this.requestPlayerData();
    
    if (playerData?.captionTracks && playerData.captionTracks.length > 0) {
      console.log('[Pauser] TranscriptService: Layer 1 - Found caption tracks via injection');
      const result = await extractFromCaptionEndpoint(playerData.captionTracks, videoId);
      
      if (result.status === TranscriptStatus.READY) {
        return result;
      }
    }
    
    // Layer 2: Try player data inspection (parse page HTML)
    console.log('[Pauser] TranscriptService: Layer 2 - Inspecting page for player data');
    const layer2Result = await extractFromPlayerInspection();
    
    if (layer2Result.status === TranscriptStatus.READY) {
      // Check if auto-generated, apply Layer 3 processing
      if (layer2Result.metadata?.isAutoGenerated) {
        console.log('[Pauser] TranscriptService: Layer 3 - Processing auto-generated captions');
        const processedResult = await extractWithAutoProcessing(
          layer2Result.segments,
          videoId,
          layer2Result.metadata.languageCode,
          layer2Result.metadata.language
        );
        return processedResult;
      }
      return layer2Result;
    }
    
    if (layer2Result.status !== TranscriptStatus.UNAVAILABLE) {
      // Got some result (partial or error with data)
      return layer2Result;
    }
    
    // Layer 4: DOM fallback
    console.log('[Pauser] TranscriptService: Layer 4 - Attempting DOM extraction');
    const layer4Result = await extractFromDOM();
    
    if (layer4Result.status === TranscriptStatus.READY || layer4Result.status === TranscriptStatus.PARTIAL) {
      return layer4Result;
    }
    
    // Layer 5: No transcript available
    console.log('[Pauser] TranscriptService: Layer 5 - No transcript available');
    return handleNoTranscript('All extraction methods failed');
  }
  
  /**
   * Cache a result
   */
  private cacheResult(videoId: string, result: TranscriptResult): void {
    this.cache.set(videoId, {
      result,
      timestamp: Date.now(),
    });
  }
  
  /**
   * Check if cache entry is expired
   */
  private isCacheExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > CACHE_DURATION_MS;
  }
  
  /**
   * Format seconds as MM:SS or HH:MM:SS
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
  
  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.cleanupListener) {
      this.cleanupListener();
      this.cleanupListener = null;
    }
    this.cache.clear();
    this.pendingExtraction = null;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get the TranscriptService singleton
 */
export function getTranscriptService(): TranscriptService {
  return TranscriptService.getInstance();
}

/**
 * Quick method to extract transcript for current video
 */
export async function extractCurrentTranscript(): Promise<TranscriptResult> {
  const videoId = new URLSearchParams(window.location.search).get('v');
  
  if (!videoId) {
    return {
      status: TranscriptStatus.ERROR,
      segments: [],
      metadata: null,
      error: 'Not on a YouTube video page',
    };
  }
  
  return TranscriptService.getInstance().extractTranscript(videoId);
}
