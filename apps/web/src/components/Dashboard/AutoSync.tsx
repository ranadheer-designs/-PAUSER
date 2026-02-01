'use client';

/**
 * AutoSync Component
 * 
 * Automatically syncs notes when the dashboard loads and on intervals.
 * This component runs in the background and doesn't render any visible UI.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { syncNotes, startAutoSync, stopAutoSync } from '@/utils/sync/notesSyncManager';

interface AutoSyncProps {
  /** Interval in milliseconds for auto-sync (default: 30 seconds) */
  intervalMs?: number;
  /** Whether to sync immediately on mount (default: true) */
  syncOnMount?: boolean;
}

export function AutoSync({ intervalMs = 30000, syncOnMount = true }: AutoSyncProps) {
  const { user } = useAuth();
  const hasSyncedOnMount = useRef(false);

  useEffect(() => {
    if (!user) return;

    // Initial sync on mount
    if (syncOnMount && !hasSyncedOnMount.current) {
      hasSyncedOnMount.current = true;
      console.log('[AutoSync] Performing initial sync on mount');
      syncNotes(user.id).catch(err => {
        console.error('[AutoSync] Initial sync failed:', err);
      });
    }

    // Start auto-sync interval
    console.log('[AutoSync] Starting auto-sync with interval:', intervalMs, 'ms');
    startAutoSync(user.id, intervalMs);

    // Cleanup on unmount
    return () => {
      console.log('[AutoSync] Stopping auto-sync');
      stopAutoSync();
    };
  }, [user, intervalMs, syncOnMount]);

  // This component doesn't render anything visible
  return null;
}
