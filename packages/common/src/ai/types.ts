import { z } from 'zod';
import { 
  ExplanationSchema, 
  SummarySchema, 
  ChallengeDraftSchema,
  CheckpointGenerationSchema,
  ContentClassificationSchema,
  QuizGenerationSchema,
  FlashcardGenerationSchema,
  CodeChallengeGenerationSchema,
  EnhancedCheckpointSchema,
  VideoAnalysisSchema,
  OrganizedNotesSchema,
  TeachingMomentSchema
} from './schemas';

/**
 * Configuration for the AI Service
 */
export interface AIConfig {
  /** Whether AI features are globally enabled */
  enabled: boolean;
  /** The model identifier (e.g., 'google/gemini-2.0-flash-exp:free') */
  model: string;
  /** API Key (OpenRouter or Google) */
  apiKey: string;
  /** Base URL (optional, defaults to OpenRouter) */
  baseUrl?: string;
}

/** Input for explain error */
export interface ExplainErrorInput {
  errorCode?: string;
  errorMessage: string;
  contextCode?: string;
  userCode?: string;
}

/** Input for summarizing content */
export interface SummarizeInput {
  text: string;
  maxLengthWords?: number;
}

/** Input for drafting a challenge */
export interface DraftChallengeInput {
  concept: string;
  difficulty: number; // 1-5
  language: 'javascript' | 'python';
}

/** Input for generating checkpoints */
export interface GenerateCheckpointsInput {
  videoTitle: string;
  startTime: number;
  endTime: number;
  transcript: string;
}

/** Input for content classification */
export interface ClassifyContentInput {
  title: string;
  transcript: string;
}

/** Input for full video analysis */
export interface AnalyzeVideoInput {
  title: string;
  transcript: string;
}

/** Input for generating quiz */
export interface GenerateQuizInput {
  transcript: string;
}

/** Input for generating flashcard */
export interface GenerateFlashcardInput {
  transcript: string;
}

/** Input for generating code challenge */
export interface GenerateCodeChallengeInput {
  transcript: string;
  language: 'javascript' | 'python' | 'typescript' | 'sql' | 'java' | 'cpp' | 'go';
  videoContext?: {
    keyConcepts: string[];
    codePatterns: string[];
  };
  conceptToTest?: string;
}

/** Input for organizing notes */
export interface OrganizeNotesInput {
  notes: Array<{
    id: string;
    body: string;
    startTimeSeconds: number;
  }>;
}

/** Input for teaching moment detection */
export interface DetectTeachingMomentsInput {
  transcriptChunk: string;
}

// Inferred types from Zod schemas
export type ExplanationResult = z.infer<typeof ExplanationSchema>;
export type SummaryResult = z.infer<typeof SummarySchema>;
export type ChallengeDraftResult = z.infer<typeof ChallengeDraftSchema>;
export type CheckpointGenerationResult = z.infer<typeof CheckpointGenerationSchema>;
export type ContentClassificationResult = z.infer<typeof ContentClassificationSchema>;
export type QuizGenerationResult = z.infer<typeof QuizGenerationSchema>;
export type FlashcardGenerationResult = z.infer<typeof FlashcardGenerationSchema>;
export type CodeChallengeGenerationResult = z.infer<typeof CodeChallengeGenerationSchema>;
export type EnhancedCheckpointResult = z.infer<typeof EnhancedCheckpointSchema>;
export type VideoAnalysisResult = z.infer<typeof VideoAnalysisSchema>;
export type OrganizedNotesAIResult = z.infer<typeof OrganizedNotesSchema>;
export type TeachingMomentResult = z.infer<typeof TeachingMomentSchema>;
export interface TeachingMomentsResult {
  moments: TeachingMomentResult[];
}

// Phase 2: Adaptive Checkpoint Types
import { AdaptiveCheckpointGenerationSchema } from './schemas';

/** Result type for adaptive checkpoint generation */
export type AdaptiveCheckpointGenerationResult = z.infer<typeof AdaptiveCheckpointGenerationSchema>;

/** User context for adaptive checkpoint personalization */
export interface UserLearningContext {
  userId?: string;
  learningHistory?: {
    completedCheckpoints: number;
    averageCompletionRate: number;
    skillProgression: Record<string, 'novice' | 'intermediate' | 'advanced'>;
  };
  currentVideoProgress?: number;
  pastPerformance?: Record<string, {
    completionRate: number;
    averageTimeSpent: number;
    difficultyRating: number;
  }>;
}

/** Input for generating adaptive checkpoints */
export interface GenerateAdaptiveCheckpointsInput {
  videoId: string;
  videoTitle: string;
  transcript: string;
  transcriptAnalysis?: {
    domain: string;
    subDomain?: string;
    detectedSkillLevel: string;
    segments: Array<{
      startTime: number;
      endTime: number;
      type: string;
      topics: string[];
    }>;
    naturalBreakPoints: number[];
  };
  userContext?: UserLearningContext;
}
