'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { syncNotes } from '@/utils/sync/notesSyncManager';
import styles from './SyncButton.module.css';

export function SyncButton() {
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    if (!user) {
      setError('Please sign in to sync notes');
      return;
    }

    setSyncing(true);
    setMessage(null);
    setError(null);

    try {
      console.log('[SyncButton] Starting manual sync for user:', user.id);
      console.log('[SyncButton] Calling syncNotes...');
      
      await syncNotes(user.id);
      
      setMessage('Notes synced successfully');
      console.log('[SyncButton] Sync completed successfully');
      
      // Refresh the page after 1 second to show updated notes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('[SyncButton] Sync error details:', err);
      console.error('[SyncButton] Error type:', typeof err);
      console.error('[SyncButton] Error constructor:', err?.constructor?.name);
      
      let errorMessage = 'Sync failed';
      if (err instanceof Error) {
        errorMessage = err.message;
        console.error('[SyncButton] Error message:', err.message);
        console.error('[SyncButton] Error stack:', err.stack);
      } else {
        console.error('[SyncButton] Non-Error object thrown:', JSON.stringify(err));
      }
      
      setError(errorMessage);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className={styles.container}>
      <button
        onClick={handleSync}
        disabled={syncing}
        className={`${styles.syncButton} ${syncing ? styles.syncing : ''}`}
        title="Manually sync notes to server"
      >
        {syncing ? (
          <>
            <svg 
              className={styles.spinner} 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle 
                className={styles.spinnerTrack} 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="3" 
              />
              <path 
                className={styles.spinnerPath} 
                d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12" 
                stroke="currentColor" 
                strokeWidth="3" 
                strokeLinecap="round" 
              />
            </svg>
            <span>Syncing...</span>
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.icon}>
               <path d="M13.3334 6.66667V3.53333C13.3334 3.06667 12.8667 2.8 12.5334 3.13333L11.5334 4.13333C10.6667 3.26667 9.46675 2.66667 8.00008 2.66667C5.06675 2.66667 2.66675 5.06667 2.66675 8C2.66675 10.9333 5.06675 13.3333 8.00008 13.3333C10.4667 13.3333 12.5334 11.6667 13.1334 9.46667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
               <path d="M10.1333 6.66666H13.3333V9.86666" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sync Notes
          </>
        )}
      </button>
      
      {message && (
        <div className={styles.message}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          {message}
        </div>
      )}
      
      {error && (
        <div className={styles.error}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}
