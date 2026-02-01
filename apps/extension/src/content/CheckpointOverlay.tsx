/**
 * Checkpoint Overlay Component
 *
 * Displays checkpoints over the YouTube video player.
 * Uses @pauser/ui components for consistent styling.
 */

import { useState, useEffect } from 'react';

import type { Checkpoint } from '@pauser/common';

// ============================================================================
// Types
// ============================================================================

interface OverlayState {
  isVisible: boolean;
  currentCheckpoint: Checkpoint | null;
}

// ============================================================================
// Component
// ============================================================================

export function CheckpointOverlay() {
  const [state, setState] = useState<OverlayState>({
    isVisible: false,
    currentCheckpoint: null,
  });

  useEffect(() => {
    // Set up video time monitoring
    const video = document.querySelector('video.html5-main-video');

    if (!video) {
      console.log('[Pauser] No video element found');
      return;
    }

    const handleTimeUpdate = () => {
      // TODO: Check if current time matches any checkpoint
      // For now, this is a placeholder
    };

    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  // Don't render anything if not visible
  if (!state.isVisible) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(11, 13, 15, 0.85)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'all',
      }}
    >
      <div
        style={{
          background: '#0F1316',
          borderRadius: '14px',
          padding: '24px',
          maxWidth: '560px',
          width: '100%',
          color: '#E6EEF8',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <h2 style={{ marginBottom: '16px' }}>Knowledge Checkpoint</h2>
        <p style={{ color: '#98A0B2' }}>
          {state.currentCheckpoint?.type ?? 'Loading...'}
        </p>
      </div>
    </div>
  );
}
