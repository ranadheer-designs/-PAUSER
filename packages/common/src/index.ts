/**
 * @pauser/common
 *
 * Shared types, SRS algorithm, and challenge engine for Pauser.
 * This package contains no UI components - only pure business logic.
 */

export type {
  Video,
  VideoId,
  YouTubeId,
  Checkpoint,
  CheckpointId,
  CheckpointType,
  CheckpointBase,
  QuizCheckpoint,
  FlashcardCheckpoint,
  RetrievalCheckpoint,
  CodeChallengeCheckpoint,
  TestCase,
  UserVideoProgress,
  CheckpointAttempt,
  Note,
  NoteWithVideo,
  CreateNoteInput,
  UpdateNoteInput,
  OrganizedNotesItem,
  OrganizedNotesSection,
  OrganizedNotesSectionType,
  OrganizedNotesResult,
} from './types';

// Transcript Types
export {
  TranscriptStatus,
  ExtractionLayer,
} from './types';

export type {
  TranscriptSegment,
  TranscriptMetadata,
  TranscriptResult,
  CaptionTrack,
  PlayerCaptionsData,
  TranscriptMessage,
  TranscriptMessageType,
} from './types';

// FSRS Types & Functions
export {
  FSRSState,
  ReviewRating,
  calculateRetrievability,
  calculateInterval,
  scheduleCard,
  reviewCard,
  DEFAULT_FSRS_PARAMETERS,
} from './srs';

export type { FSRSCard, FSRSParameters, SchedulingResult } from './srs';

// Challenge Engine
export { compareOutputs, runJavaScriptTests, runChallenge, DEFAULT_RUNNER_CONFIG } from './challenge-engine';

export type {
  ChallengeLanguage,
  ChallengeTestCase,
  TestCaseResult,
  ChallengeResult,
  RunnerConfig,
} from './challenge-engine';

// Challenges System
export * from './challenges';

// Checkpoint System
export * from './checkpoints';

// Supabase
export { createBrowserClient } from './supabase';
export type { Database } from './types/database';

// AI Service
export { AIService } from './ai/service';
export type { AIConfig, ExplainErrorInput } from './ai/types';
export * from './ai/schemas';
