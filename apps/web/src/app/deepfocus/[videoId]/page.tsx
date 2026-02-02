'use client';

/**
 * DeepFocus Page
 * 
 * The signature Pauser experience:
 * - Distraction-free video learning
 * - Creative Cognitive Checkpoints (prediction, explanation, one-sentence rule)
 * - Timestamped notes with offline-first architecture
 * - Soft seek prevention
 * 
 * Route: /deepfocus/[videoId]
 * Query params: ?t=123 (timestamp), ?noteId=xyz (open specific note)
 */

import { useCallback, useState, useEffect, useRef, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { VideoPlayer, VideoPlayerHandle, CheckpointOverlay } from '@/components/DeepFocus';
import { Logo } from '@/components/Common/Logo';
import { AuthPromptModal } from '@/components/DeepFocus/AuthPromptModal';
import { createClient } from '@/utils/supabase/client';
import { NotesPanel } from '@/components/DeepFocus/NotesPanel';
import { useDeepFocus, type Checkpoint } from '@/hooks/useDeepFocus';
import { useNotes } from '@/hooks/useNotes';
import { parseUrlTimestamp } from '@/lib/player/PlayerController';
import { generateCheckpoints } from '@/actions/checkpoints';
import { getCheckpointsByVideoId, saveCheckpoints, getContentIdByVideoId } from '@/actions/checkpointActions';
import { saveAttempt } from '@/actions/analytics';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';
import styles from './page.module.css';

interface PageProps {
  params: { videoId: string };
}

// Mock user ID (in production, get from auth context)
const MOCK_USER_ID = 'user-123';

export default function DeepFocusPage({ params }: PageProps) {
  const { videoId } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [videoDescription, setVideoDescription] = useState<string>('');
  const [seekNudge, setSeekNudge] = useState<string | null>(null);
  const [initialSeekDone, setInitialSeekDone] = useState(false);
  const [checkpointsEnabled, setCheckpointsEnabled] = useState(false);
  const [checkpointsLoading, setCheckpointsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [contentId, setContentId] = useState<string | null>(null);
  
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Fetch video metadata on mount
  useEffect(() => {
    async function fetchVideoInfo() {
      try {
        const response = await fetch(`/api/video-info?videoId=${videoId}`);
        if (response.ok) {
          const data = await response.json();
          setVideoTitle(data.title || '');
          setVideoDescription(data.description || '');
          console.log(`[DeepFocus] Loaded video: "${data.title}"`);
        }
      } catch (error) {
        console.warn('[DeepFocus] Failed to fetch video info:', error);
      }
    }
    fetchVideoInfo();
    
    // Get content ID for artifacts
    getContentIdByVideoId(videoId).then(id => {
      if (id) setContentId(id);
    });
    
    // Check auth status
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
    });
  }, [videoId]);
  
  const playerRef = useRef<VideoPlayerHandle>(null);
  
  // Note-taking state for Enter key feature
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const triggerTakeNoteRef = useRef<(() => void) | null>(null);


  // DeepFocus state
  const {
    currentTime,
    maxAllowedTime,
    activeCheckpoint,
    checkpoints,
    completedCheckpoints,
    awaitingReveal,
    updateTime,
    completeCheckpoint,
    submitPrediction,
    dismissCheckpoint,
    setPlaying,
    loadCheckpoints,
  } = useDeepFocus();

  // Load existing checkpoints from database on mount
  useEffect(() => {
    async function loadExistingCheckpoints() {
      try {
        setCheckpointsLoading(true);
        const existing = await getCheckpointsByVideoId(videoId);
        
        if (existing.length > 0) {
          console.log(`[DeepFocus] Loaded ${existing.length} existing checkpoints`);
          loadCheckpoints(existing);
          setCheckpointsEnabled(true);
        }
      } catch (error) {
        console.warn('[DeepFocus] Failed to load existing checkpoints:', error);
      } finally {
        setCheckpointsLoading(false);
      }
    }
    loadExistingCheckpoints();
  }, [videoId, loadCheckpoints]);

  // Notes state
  const {
    notes,
    loading: notesLoading,
    createNote,
    updateNote,
  } = useNotes({
    contentId: videoId,
    userId: MOCK_USER_ID,
    autoSync: true,
  });

  // Handle checkpoint toggle
  const handleCheckpointToggle = useCallback(async () => {
    if (checkpointsEnabled) {
      // Disable: clear checkpoints
      setCheckpointsEnabled(false);
      loadCheckpoints([]);
    } else {
      // Check auth first - require sign in for checkpoints
      if (!isAuthenticated) {
        setShowAuthPrompt(true);
        return;
      }
      
      // Enable: generate cognitive checkpoints
      setCheckpointsEnabled(true);
      
      if (videoDuration > 0) {
        startTransition(async () => {
          try {
            console.log(`[DeepFocus] Generating cognitive checkpoints for: "${videoTitle}"`);
            const generated = await generateCheckpoints({
              videoId,
              videoTitle: videoTitle || `YouTube Video ${videoId}`,
              videoDuration,
              videoDescription,
            });
            
            // Map to Checkpoint type
            const mapped: Checkpoint[] = generated.map(cp => ({
              id: cp.id,
              timestamp: cp.timestamp,
              type: cp.type,
              title: cp.title,
              completed: cp.completed,
              content: cp.content,
            }));
            
            console.log(`[DeepFocus] Generated ${mapped.length} cognitive checkpoints`);
            
            // Save checkpoints to Supabase for persistence
            try {
              await saveCheckpoints(videoId, mapped, {
                title: videoTitle,
                description: videoDescription,
              });
              console.log('[DeepFocus] Checkpoints saved to database');
            } catch (saveError) {
              console.warn('[DeepFocus] Failed to save checkpoints:', saveError);
            } finally {
              // Update contentId for artifacts regardless of save success
              // (content record might exist even if saving checkpoints failed)
              const id = await getContentIdByVideoId(videoId);
              if (id) setContentId(id);
              loadCheckpoints(mapped);
            }
          } catch (error) {
            console.error('Failed to generate checkpoints:', error);
            setCheckpointsEnabled(false);
          }
        });
      }
    }
  }, [checkpointsEnabled, videoDuration, videoId, videoTitle, videoDescription, isAuthenticated, loadCheckpoints]);

  // Auto-pause video when checkpoint becomes active
  useEffect(() => {
    if (activeCheckpoint && playerRef.current) {
      console.log('[DeepFocus] Checkpoint triggered, pausing video');
      playerRef.current.pause();
    }
  }, [activeCheckpoint]);

  // Global Enter key listener for note-taking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      
      const target = e.target as HTMLElement;
      const isInput = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable;

      if (isInput) return;
      if (isEditingNote || activeCheckpoint) return;
      
      if (isPlaying && triggerTakeNoteRef.current) {
        e.preventDefault();
        console.log('[DeepFocus] Enter pressed - triggering note-taking');
        triggerTakeNoteRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isEditingNote, activeCheckpoint]);

  // Handle URL timestamp parameter
  useEffect(() => {
    if (!initialSeekDone && playerRef.current?.isReady() && videoDuration > 0) {
      const urlTimestamp = parseUrlTimestamp(window.location.href);
      if (urlTimestamp !== null && urlTimestamp > 0 && urlTimestamp <= videoDuration) {
        playerRef.current.seekTo(urlTimestamp).catch(err => {
          console.error('Failed to seek to URL timestamp:', err);
        });
      }
      setInitialSeekDone(true);
    }
  }, [initialSeekDone, videoDuration]);

  // Handle time updates
  const onTimeUpdate = useCallback((time: number) => {
    if (time > maxAllowedTime + 2) {
      setSeekNudge("Let's focus on learning step by step.");
      setTimeout(() => setSeekNudge(null), 3000);
    }
    updateTime(time);
  }, [updateTime, maxAllowedTime]);

  // Handle video ready
  const onVideoReady = useCallback((duration: number) => {
    setVideoDuration(duration);
  }, []);

  // Handle play/pause
  const onPlay = useCallback(() => {
    setPlaying(true);
    setIsPlaying(true);
    setTimeout(() => {
        window.focus(); 
        document.body.focus();
    }, 100);
  }, [setPlaying]);
  
  const onPause = useCallback(() => {
    setPlaying(false);
    setIsPlaying(false);
  }, [setPlaying]);

  // Handle checkpoint completion
  const onCheckpointComplete = useCallback(async (checkpointId: string, timeSpentMs: number = 0) => {
    if (activeCheckpoint) {
      completeCheckpoint(activeCheckpoint.id);
      
      // Resume video immediately
      setTimeout(() => {
        playerRef.current?.play();
      }, 100);

      // Record attempt for stats
      try {
        await saveAttempt(
          activeCheckpoint.id,
          true, // completed = correct for cognitive milestones
          timeSpentMs,
          { type: activeCheckpoint.type }
        );
        console.log('[DeepFocus] Attempt recorded for stats');
      } catch (err) {
        console.warn('[DeepFocus] Failed to record attempt:', err);
      }
    }
  }, [activeCheckpoint, completeCheckpoint]);

  // Handle prediction continue to reveal
  const onContinueToReveal = useCallback((checkpointId: string, userText: string, revealTimestamp: number) => {
    submitPrediction(checkpointId, userText, revealTimestamp);
    // Resume video to continue to reveal
    setTimeout(() => {
      playerRef.current?.play();
    }, 100);
  }, [submitPrediction]);

  // Handle "Take Note" button
  const handleTakeNote = useCallback(async () => {
    if (!playerRef.current) return null;
    await playerRef.current.pause();
    return null;
  }, []);

  // Handle note click (seek to timestamp)
  const handleNoteClick = useCallback(async (note: any) => {
    if (!playerRef.current) return;
    await playerRef.current.pause();
    await playerRef.current.seekTo(note.startTimeSeconds);
  }, []);

  // Handle note save
  const handleNoteSave = useCallback(
    async (noteId: string | undefined, data: { title?: string; body: string }) => {
      try {
        if (noteId) {
          await updateNote(noteId, data);
        } else {
          const timestamp = playerRef.current?.getCurrentTime() ?? 0;
          await createNote({
            startTimeSeconds: timestamp,
            ...data,
          });
        }
      } catch (error) {
        console.error('Failed to save note:', error);
        throw error;
      }
    },
    [createNote, updateNote]
  );

  // Handle note complete
  const handleNoteComplete = useCallback(async () => {
    if (!playerRef.current) return;
    await playerRef.current.play();
  }, []);

  // Get checkpoint type label
  const getCheckpointTypeLabel = (type: string) => {
    switch (type) {
      case 'prediction': return '🔮 Prediction';
      case 'explanation': return '💬 Explain';
      case 'one_sentence_rule': return '📝 One-Sentence';
      case 'snapshot': return '💭 Snapshot';
      case 'practice_resource': return '💻 Practice';
      default: return '📍 Checkpoint';
    }
  };

  return (
    <ProtectedRoute>
    <main className={styles.main}>
      <div className={styles.content}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button 
              className={styles.dashboardButton}
              onClick={() => router.push('/dashboard')}
              title="Return to Dashboard"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div className={styles.brand}>
              <Logo size="small" />
              <span className={styles.separator}>/</span>
              <h1 className={styles.title}>DeepFocus</h1>
            </div>
          </div>
          <div className={styles.headerRight}>
            {/* Checkpoint Toggle */}
            <label className={styles.toggleLabel}>
              <span className={styles.toggleText}>
                {isPending ? 'Generating...' : 'Checkpoints'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={checkpointsEnabled}
                className={`${styles.toggle} ${checkpointsEnabled ? styles.toggleOn : ''} ${isPending ? styles.toggleLoading : ''}`}
                onClick={handleCheckpointToggle}
                disabled={isPending}
              >
                <span className={styles.toggleThumb} />
              </button>
            </label>
            {checkpointsEnabled && (
              <div className={styles.progress}>
                {completedCheckpoints.length} / {checkpoints.length}
              </div>
            )}
            {awaitingReveal && (
              <div className={styles.revealIndicator}>
                Awaiting reveal...
              </div>
            )}
          </div>
        </header>

        {/* Video Player */}
        <div className={styles.playerWrapper}>
          <VideoPlayer
            ref={playerRef}
            videoId={videoId}
            onTimeUpdate={onTimeUpdate}
            onPlay={onPlay}
            onPause={onPause}
            onReady={onVideoReady}
          />
          
          {/* Seek Nudge Message */}
          {seekNudge && (
            <div className={styles.nudge}>
              {seekNudge}
            </div>
          )}
        </div>

        {/* Minimal Progress Bar */}
        <div className={styles.timeline}>
          <div 
            className={styles.timelineProgress}
            style={{ width: `${(currentTime / (videoDuration || 1)) * 100}%` }}
          />
          <div 
            className={styles.timelineMax}
            style={{ width: `${(maxAllowedTime / (videoDuration || 1)) * 100}%` }}
          />
          {/* Checkpoint markers */}
          {checkpoints.map(cp => (
            <div
              key={cp.id}
              className={`${styles.checkpointMarker} ${
                completedCheckpoints.includes(cp.id) ? styles.completed : ''
              } ${cp.type === 'prediction' ? styles.markerPrediction : 
                   cp.type === 'explanation' ? styles.markerExplanation : 
                   cp.type === 'practice_resource' ? styles.markerPractice :
                   styles.markerOneSentence}`}
              style={{ 
                left: `${(cp.timestamp / (videoDuration || 1)) * 100}%`,
                cursor: 'pointer',
                zIndex: 50 
              }}
              title={`${getCheckpointTypeLabel(cp.type)}: ${cp.title} (Click to test)`}
              onClick={() => {
                console.log(`[DeepFocus] Debug jump to checkpoint: ${cp.title}`);
                // Seek to 2 seconds before checkpoint to verify trigger
                playerRef.current?.seekTo(Math.max(0, cp.timestamp - 2));
                playerRef.current?.play();
              }}
            />
          ))}
        </div>

        {/* Checkpoint Overlay */}
        {activeCheckpoint && (
          <CheckpointOverlay
            checkpoint={activeCheckpoint}
            contentId={contentId}
            onComplete={onCheckpointComplete}
            onDismiss={dismissCheckpoint}
            onContinueToReveal={onContinueToReveal}
          />
        )}
      </div>

      {/* Notes Panel */}
      <aside className={styles.notesPanel}>
        <NotesPanel
          contentId={videoId}
          notes={notes}
          currentTime={currentTime}
          onTakeNote={handleTakeNote}
          onNoteClick={handleNoteClick}
          onNoteSave={handleNoteSave}
          onNoteComplete={handleNoteComplete}
          onEditingChange={setIsEditingNote}
          triggerTakeNoteRef={triggerTakeNoteRef}
        />
      </aside>

      {/* Auth Prompt Modal */}
      {showAuthPrompt && (
        <AuthPromptModal
          onClose={() => setShowAuthPrompt(false)}
          onContinueWithout={() => setShowAuthPrompt(false)}
        />
      )}
    </main>
    </ProtectedRoute>
  );
}
