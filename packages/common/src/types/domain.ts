/**
 * Core Domain Types
 */

import type { Database } from './database';

export type VideoId = string;
export type YouTubeId = string;
export type CheckpointId = string;
export type ContentId = string;
export type UserId = string;

// Database row types for convenience
export type DbProfile = Database['public']['Tables']['profiles']['Row'];
export type DbContent = Database['public']['Tables']['contents']['Row'];
export type DbCheckpoint = Database['public']['Tables']['checkpoints']['Row'];
export type DbAttempt = Database['public']['Tables']['attempts']['Row'];

/**
 * Valid checkpoint types
 */
export type CheckpointType = 'quiz' | 'flashcard' | 'code_challenge' | 'retrieval';

/**
 * Base Checkpoint interface
 */
export interface CheckpointBase {
  id: CheckpointId;
  contentId: ContentId;
  timestamp: number; // seconds
  type: CheckpointType;
  title?: string;
  prompt: string;
  difficulty: number;
  aiGenerated: boolean;
}

export interface QuizCheckpoint extends CheckpointBase {
  type: 'quiz';
  options: string[];
  answerKey: {
    index: number;
    explanation?: string;
  };
}

export interface FlashcardCheckpoint extends CheckpointBase {
  type: 'flashcard';
  answerKey: {
    back: string;
  };
}

export interface CodeChallengeCheckpoint extends CheckpointBase {
  type: 'code_challenge';
  starterCode: string;
  language: 'javascript' | 'typescript' | 'python';
  testCases: TestCase[];
  solutionCode?: string;
}

export interface RetrievalCheckpoint extends CheckpointBase {
  type: 'retrieval';
  answerKey: {
    keywords: string[];
  };
}

export type Checkpoint = 
  | QuizCheckpoint 
  | FlashcardCheckpoint 
  | CodeChallengeCheckpoint 
  | RetrievalCheckpoint;

export interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

export interface Video {
  id: ContentId;
  externalId: YouTubeId;
  title: string;
  duration: number;
  thumbnailUrl?: string;
}

export interface UserVideoProgress {
  userId: UserId;
  videoId: ContentId;
  currentTimestamp: number;
  completedCheckpoints: CheckpointId[];
  isCompleted: boolean;
  lastUpdated: Date;
}

export interface CheckpointAttempt {
  id: string;
  checkpointId: CheckpointId;
  userId: UserId;
  timestamp: Date;
  isCorrect: boolean;
  userAnswer: unknown;
}

/**
 * Note Types
 */
export type NoteId = string;

export type DbNote = Database['public']['Tables']['notes']['Row'];

export interface Note {
  id: NoteId;
  userId: UserId;
  contentId: ContentId;
  startTimeSeconds: number;
  endTimeSeconds?: number;
  title?: string;
  body: string;
  isDraft: boolean;
  localId?: string;
  syncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteWithVideo extends Note {
  video: {
    id: ContentId;
    title: string;
    thumbnailUrl: string | null;
    externalId: YouTubeId;
  };
}

export interface CreateNoteInput {
  contentId: ContentId;
  startTimeSeconds: number;
  endTimeSeconds?: number;
  title?: string;
  body: string;
  isDraft?: boolean;
}

export interface UpdateNoteInput {
  title?: string;
  body?: string;
  endTimeSeconds?: number;
  isDraft?: boolean;
}

/**
 * AI-Organized Notes Types
 * 
 * These types support the AI-Organized Notes feature that groups
 * and labels the learner's notes WITHOUT rewriting them.
 */

export interface OrganizedNotesItem {
  /** Verbatim text from the original note */
  text: string;
  /** Original timestamp in seconds */
  timestamp: number;
  /** Reference to the original note ID */
  noteId: string;
}

export type OrganizedNotesSectionType = 
  | 'main_ideas' 
  | 'examples' 
  | 'unclear_points' 
  | 'repeated_ideas';

export interface OrganizedNotesSection {
  /** Section type identifier */
  type: OrganizedNotesSectionType;
  /** Human-readable section label */
  label: string;
  /** Notes grouped into this section */
  items: OrganizedNotesItem[];
}

export interface OrganizedNotesResult {
  /** Array of organized sections */
  sections: OrganizedNotesSection[];
  /** ISO timestamp when organization was generated */
  generatedAt: string;
  /** Hash of source notes to detect changes */
  notesHash: string;
}
