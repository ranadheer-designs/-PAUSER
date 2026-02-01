'use client';

/**
 * useDeepFocus Hook
 * 
 * Manages DeepFocus session state:
 * - Video playback position
 * - Checkpoint detection and display
 * - Seek prevention (soft enforcement)
 * 
 * DESIGN PHILOSOPHY:
 * Seek prevention is "soft" — we nudge, not punish.
 * Users can always override if they choose.
 * 
 * CREATIVE COGNITIVE CHECKPOINTS:
 * This hook now supports three cognition-first checkpoint modes:
 * 1. Prediction Before Reveal - triggered BEFORE explanations
 * 2. Explain It Back - triggered AFTER explanations  
 * 3. One-Sentence Rule - compression exercises
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// ARTIFACT TYPES
// ============================================================================

/** Learning artifact created from checkpoint responses */
export interface LearningArtifact {
  id: string;
  userId: string;
  contentId: string;
  checkpointId: string;
  type: 'prediction' | 'explanation' | 'one_sentence_rule' | 'snapshot';
  userText: string;
  followUpText?: string;
  promptUsed: string;
  requiredKeyword?: string;
  maxWords?: number;
  targetAudience?: 'junior' | 'past_self' | 'friend';
  conceptName?: string;
  revealTimestampSeconds?: number;
  timestampSeconds: number;
  convertedToFlashcardId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CHECKPOINT CONTENT TYPES (Cognitive Modes)
// ============================================================================

/** 
 * Prediction Before Reveal
 * Triggered BEFORE an explanation or reveal in the video.
 * Learner predicts what will happen, then reflects after seeing the answer.
 */
export interface PredictionContent {
  type: 'prediction';
  /** The prompt shown to the user */
  prompt: string;
  /** Brief context about what's being discussed */
  context: string;
  /** Timestamp when the video reveals the answer */
  revealTimestamp: number;
}

/**
 * Explain It Back
 * Triggered AFTER an explanation.
 * Learner teaches the concept back in their own words.
 */
export interface ExplanationContent {
  type: 'explanation';
  /** The prompt shown to the user */
  prompt: string;
  /** Name of the concept being explained */
  conceptName: string;
  /** Who to explain to */
  targetAudience: 'junior' | 'past_self' | 'friend';
}

/**
 * One-Sentence Rule
 * Learner compresses understanding into a single sentence.
 */
export interface OneSentenceRuleContent {
  type: 'one_sentence_rule';
  /** Name of the concept to describe */
  conceptName: string;
  /** A word that must appear in the sentence */
  requiredKeyword: string;
  /** Maximum words allowed */
  maxWords: number;
}

/**
 * Understanding Snapshot
 * Learner pauses to reflect on what they understand so far.
 */
export interface SnapshotContent {
  type: 'snapshot';
  prompt: string;
  context: string;
}

/**
 * Practice Resource
 * Suggests a relevant LeetCode/HackerRank problem based on video content.
 * Opens in sidebar or new tab for hands-on practice while watching.
 */
export interface PracticeResourceContent {
  type: 'practice_resource';
  platform: 'leetcode' | 'hackerrank' | 'codewars';
  problemId: string;
  title: string;
  url: string;
  difficulty: 'easy' | 'medium' | 'hard';
  matchConfidence: number;
  matchReason: string;
}

/** Union of all checkpoint content types */
export type CheckpointContent = PredictionContent | ExplanationContent | OneSentenceRuleContent | SnapshotContent | PracticeResourceContent;

// ============================================================================
// CHECKPOINT TYPE
// ============================================================================

export interface Checkpoint {
  id: string;
  /** Timestamp in seconds when checkpoint triggers */
  timestamp: number;
  /** Type of cognitive checkpoint */
  type: 'prediction' | 'explanation' | 'one_sentence_rule' | 'snapshot' | 'practice_resource';
  /** Display title for the checkpoint */
  title: string;
  /** Whether user has completed this checkpoint */
  completed: boolean;
  /** Content specific to the checkpoint type */
  content?: CheckpointContent;
}

// ============================================================================
// STATE TYPE
// ============================================================================

interface DeepFocusState {
  currentTime: number;
  maxAllowedTime: number;
  isPlaying: boolean;
  activeCheckpoint: Checkpoint | null;
  checkpoints: Checkpoint[];
  completedCheckpoints: string[];
  /** Track if we're in "reveal" mode for predictions */
  awaitingReveal: boolean;
  /** The prediction that's waiting for reveal */
  pendingPrediction?: {
    checkpointId: string;
    userText: string;
    revealTimestamp: number;
  };
}

// ============================================================================
// HOOK
// ============================================================================

export function useDeepFocus(initialCheckpoints: Checkpoint[] = []) {
  const [state, setState] = useState<DeepFocusState>({
    currentTime: 0,
    maxAllowedTime: 0,
    isPlaying: false,
    activeCheckpoint: null,
    checkpoints: initialCheckpoints,
    completedCheckpoints: [],
    awaitingReveal: false,
    pendingPrediction: undefined,
  });

  // Track the furthest point user has legitimately reached
  const maxReachedRef = useRef(0);
  // Track which checkpoints have been triggered (even if dismissed)
  const triggeredCheckpointsRef = useRef<Set<string>>(new Set());

  /**
   * Update current playback time.
   * Checks for checkpoints and updates max allowed time.
   */
  /**
   * Update current playback time.
   * Checks for checkpoints and updates max allowed time.
   */
  const updateTime = useCallback((time: number) => {
    setState(prev => {
      // Update max reached if going forward naturally
      if (time > maxReachedRef.current && time <= maxReachedRef.current + 2) {
        maxReachedRef.current = time;
      }

      // Check if we're waiting for a prediction reveal
      if (prev.awaitingReveal && prev.pendingPrediction) {
        if (time >= prev.pendingPrediction.revealTimestamp) {
          // Time to show the comparison! 
          const checkpoint = prev.checkpoints.find(cp => cp.id === prev.pendingPrediction!.checkpointId);
          if (checkpoint) {
            console.log(`[useDeepFocus] Prediction reveal triggered at ${time}s`);
            return {
              ...prev,
              currentTime: time,
              maxAllowedTime: maxReachedRef.current,
              activeCheckpoint: {
                ...checkpoint,
                // Mark as reveal mode
                content: checkpoint.content ? {
                  ...checkpoint.content,
                  _revealMode: true,
                  _userPrediction: prev.pendingPrediction!.userText,
                } as any : undefined,
              },
              awaitingReveal: false,
            };
          }
        }
      }

      // Find a checkpoint that should be triggered
      // Only look for new checkpoints if we don't already have one active
      let upcomingCheckpoint: Checkpoint | undefined;
      
      if (!prev.activeCheckpoint) {
        upcomingCheckpoint = prev.checkpoints.find(cp => {
          const shouldTrigger = 
            !prev.completedCheckpoints.includes(cp.id) && // Not completed
            !triggeredCheckpointsRef.current.has(cp.id) && // Not already triggered
            time >= cp.timestamp && // Passed the timestamp
            time < cp.timestamp + 5; // Within 5 second window (more lenient)
          
          return shouldTrigger;
        });
        
        if (upcomingCheckpoint) {
          console.log(`[useDeepFocus] Checkpoint triggered at ${time}s: "${upcomingCheckpoint.title}"`);
        }
      }

      return {
        ...prev,
        currentTime: time,
        maxAllowedTime: maxReachedRef.current,
        activeCheckpoint: upcomingCheckpoint || prev.activeCheckpoint,
      };
    });
  }, []);

  // Register triggered checkpoints in ref (Effect handles side-effect)
  useEffect(() => {
    if (state.activeCheckpoint) {
      triggeredCheckpointsRef.current.add(state.activeCheckpoint.id);
    }
  }, [state.activeCheckpoint]);

  /**
   * Handle seek attempts.
   * Returns the time to actually seek to (soft enforcement).
   */
  const handleSeek = useCallback((requestedTime: number): number => {
    // Always allow seeking backward
    if (requestedTime <= maxReachedRef.current) {
      return requestedTime;
    }

    // Soft block: return to max allowed
    // The UI can show a message explaining why
    return maxReachedRef.current;
  }, []);

  /**
   * Mark a checkpoint as completed.
   * Unlocks further progress.
   */
  const completeCheckpoint = useCallback((checkpointId: string) => {
    setState(prev => {
      const checkpoint = prev.checkpoints.find(cp => cp.id === checkpointId);
      
      // Extend max allowed time past this checkpoint
      if (checkpoint) {
        maxReachedRef.current = Math.max(maxReachedRef.current, checkpoint.timestamp + 1);
      }

      return {
        ...prev,
        completedCheckpoints: [...prev.completedCheckpoints, checkpointId],
        activeCheckpoint: null,
        maxAllowedTime: maxReachedRef.current,
        awaitingReveal: false,
        pendingPrediction: undefined,
      };
    });
  }, []);

  /**
   * Handle prediction submission - sets up waiting for reveal.
   */
  const submitPrediction = useCallback((checkpointId: string, userText: string, revealTimestamp: number) => {
    setState(prev => {
      const checkpoint = prev.checkpoints.find(cp => cp.id === checkpointId);
      
      if (checkpoint) {
        maxReachedRef.current = Math.max(maxReachedRef.current, checkpoint.timestamp + 1);
      }

      return {
        ...prev,
        activeCheckpoint: null,
        maxAllowedTime: maxReachedRef.current,
        awaitingReveal: true,
        pendingPrediction: {
          checkpointId,
          userText,
          revealTimestamp,
        },
      };
    });
  }, []);

  /**
   * Dismiss checkpoint without completing (user chose to skip).
   */
  const dismissCheckpoint = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeCheckpoint: null,
    }));
  }, []);

  /**
   * Set playing state.
   */
  const setPlaying = useCallback((playing: boolean) => {
    setState(prev => ({ ...prev, isPlaying: playing }));
  }, []);

  /**
   * Load checkpoints for a video.
   */
  const loadCheckpoints = useCallback((checkpoints: Checkpoint[]) => {
    console.log(`[useDeepFocus] Loading ${checkpoints.length} checkpoints:`, checkpoints.map(cp => `${cp.id} at ${cp.timestamp}s`));
    setState(prev => ({
      ...prev,
      checkpoints,
      completedCheckpoints: [],
      activeCheckpoint: null,
      awaitingReveal: false,
      pendingPrediction: undefined,
    }));
    maxReachedRef.current = 0;
    triggeredCheckpointsRef.current = new Set();
  }, []);

  return {
    ...state,
    updateTime,
    handleSeek,
    completeCheckpoint,
    submitPrediction,
    dismissCheckpoint,
    setPlaying,
    loadCheckpoints,
  };
}
