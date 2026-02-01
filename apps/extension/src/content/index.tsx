/**
 * Pauser Content Script
 *
 * Injected into YouTube pages to:
 * - Detect video playback
 * - Monitor timestamps for checkpoints
 * - Render checkpoint overlays
 */

import { createRoot } from 'react-dom/client';

import { CheckpointOverlay } from './CheckpointOverlay';

// ============================================================================
// Constants
// ============================================================================

const PAUSER_ROOT_ID = 'pauser-overlay-root';

// ============================================================================
// YouTube Detection
// ============================================================================

/**
 * Find the YouTube video player element.
 */
function findVideoPlayer(): HTMLVideoElement | null {
  return document.querySelector('video.html5-main-video');
}

/**
 * Find the player container for overlay injection.
 */
function findPlayerContainer(): HTMLElement | null {
  return document.querySelector('#movie_player');
}

// ============================================================================
// Overlay Injection
// ============================================================================

/**
 * Create and mount the React overlay component.
 */
function mountOverlay(container: HTMLElement): void {
  // Check if already mounted
  if (document.getElementById(PAUSER_ROOT_ID)) {
    return;
  }

  // Create root element
  const root = document.createElement('div');
  root.id = PAUSER_ROOT_ID;
  root.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9999;
    pointer-events: none;
  `;

  container.appendChild(root);

  // Mount React
  const reactRoot = createRoot(root);
  reactRoot.render(<CheckpointOverlay />);

  console.log('[Pauser] Overlay mounted');
}

// ============================================================================
// SPA Navigation Handler
// ============================================================================

/**
 * Handle YouTube's SPA navigation.
 * YouTube uses custom navigation events instead of full page loads.
 */
function setupNavigationListener(): void {
  // YouTube fires this event when navigating between pages
  document.addEventListener('yt-navigate-finish', () => {
    console.log('[Pauser] Navigation detected');
    initializeOnVideoPage();
  });
}

/**
 * Initialize Pauser on video pages.
 */
function initializeOnVideoPage(): void {
  // Only run on video watch pages
  if (!window.location.pathname.includes('/watch')) {
    return;
  }

  const container = findPlayerContainer();
  const video = findVideoPlayer();

  if (container && video) {
    mountOverlay(container);
  } else {
    // Retry after a short delay (player might not be loaded yet)
    setTimeout(initializeOnVideoPage, 500);
  }
}

// ============================================================================
// Main
// ============================================================================

console.log('[Pauser] Content script loaded');

setupNavigationListener();
initializeOnVideoPage();
