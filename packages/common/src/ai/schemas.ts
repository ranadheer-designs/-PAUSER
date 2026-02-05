/**
 * Zod Schemas for Validating AI Output
 * 
 * Ensures that the AI always returns structured, predictable data.
 */

import { z } from 'zod';

/**
 * Schema for code error explanations
 */
export const ExplanationSchema = z.object({
  /** Concise title of the error */
  title: z.string(),
  /** Clear, beginner-friendly explanation */
  explanation: z.string(),
  /** The corrected code snippet (optional) */
  suggestedFix: z.string().optional(),
  /** Key concepts related to this error */
  relatedConcepts: z.array(z.string()),
});

/**
 * Schema for content summaries
 */
export const SummarySchema = z.object({
  /** The main summary text */
  summary: z.string(),
  /** Key bullet points extracted */
  keyPoints: z.array(z.string()),
  /** Estimated time to read in seconds */
  readingTimeSeconds: z.number().int(),
});

/**
 * Schema for drafting challenges
 */
export const ChallengeDraftSchema = z.object({
  title: z.string(),
  description: z.string(),
  starterCode: z.string(),
  /** Basic test cases */
  testCases: z.array(z.object({
    input: z.string(),
    expectedOutput: z.string(),
    description: z.string().optional(),
  })),
  solutionCode: z.string(),
});

/**
 * Schema for checkpoint generation
 */
export const CheckpointGenerationSchema = z.object({
  checkpoints: z.array(z.object({
    /** Timestamp in seconds when checkpoint should appear */
    timestamp: z.number(),
    /** Type of checkpoint */
    type: z.enum(['quiz', 'flashcard', 'code_challenge']),
    /** Clear title describing the checkpoint */
    title: z.string(),
  })),
});

/**
 * Schema for content classification
 */
export const ContentClassificationSchema = z.object({
  /** Whether the content is programming/coding related */
  isProgramming: z.boolean(),
  /** Detected programming language if applicable */
  language: z.enum(['javascript', 'typescript', 'python', 'sql', 'java', 'cpp', 'go', 'other', 'none']),
  /** Main topics covered */
  topics: z.array(z.string()),
  /** Confidence score 0-1 */
  confidence: z.number(),
});

/**
 * Schema for full video transcript analysis
 * Analyzes entire video before generating checkpoints
 * V2: Enhanced with content classification and concept windows
 */
export const VideoAnalysisSchema = z.object({
  // Content Classification (Moderate Gating)
  /** Type of content detected */
  contentType: z.enum([
    'coding_tutorial',      // NeetCode, freeCodeCamp, coding walkthroughs
    'tech_lecture',         // CS lectures, conference talks
    'tech_review',          // Product reviews, tech news (no hands-on learning)
    'educational_other',    // Non-coding educational (math, science, etc.)
    'entertainment',        // Vlogs, lifestyle, gaming
    'mixed'                 // Some educational, some not
  ]),
  /** Whether checkpoints should be generated (based on moderate gating) */
  shouldGenerateCheckpoints: z.boolean(),
  /** Reason for skipping checkpoints (if shouldGenerateCheckpoints is false) */
  skipReason: z.string().optional(),
  
  // Programming Analysis (if applicable)
  /** Primary programming language taught */
  language: z.enum(['javascript', 'typescript', 'python', 'sql', 'java', 'cpp', 'go', 'other', 'none']),
  /** Whether this is a programming tutorial */
  isProgramming: z.boolean(),
  /** Confidence in the analysis (0-1) */
  confidence: z.number(),
  
  // Concept Windows (for post-explanation checkpoint placement)
  /** Concepts with their timestamp ranges for precise checkpoint placement */
  conceptWindows: z.array(z.object({
    /** Name of the concept taught */
    name: z.string(),
    /** Approximate timestamp (in seconds) when concept explanation starts */
    startTimestamp: z.number(),
    /** Approximate timestamp (in seconds) when concept explanation ends */
    endTimestamp: z.number(),
    /** Depth of explanation */
    depth: z.enum(['introduction', 'explanation', 'deep_dive']),
  })).optional(),
  
  // Problem Mentions (for practice matching)
  /** LeetCode/HackerRank problems explicitly mentioned */
  mentionedProblems: z.array(z.object({
    /** Problem name (e.g., "Two Sum") */
    name: z.string(),
    /** Platform (e.g., "leetcode") */
    platform: z.string(),
    /** Approximate timestamp when mentioned */
    timestamp: z.number(),
    /** Confidence in detection (0-1) */
    confidence: z.number(),
  })).optional(),
  
  // Legacy fields (kept for compatibility)
  /** 5-10 specific concepts taught in the video */
  keyConcepts: z.array(z.string()),
  /** Code patterns/structures demonstrated */
  codePatterns: z.array(z.string()),
  /** Main topics covered */
  topics: z.array(z.string()),
  /** Brief 2-3 sentence summary */
  summary: z.string(),
});

/**
 * Schema for quiz generation
 */
export const QuizGenerationSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().min(0).max(3),
  explanation: z.string(),
});

/**
 * Schema for flashcard generation
 */
export const FlashcardGenerationSchema = z.object({
  front: z.string(),
  back: z.string(),
  hint: z.string().optional(),
});

/**
 * Schema for code challenge generation
 */
export const CodeChallengeGenerationSchema = z.object({
  language: z.enum(['javascript', 'python', 'typescript', 'sql', 'java', 'cpp', 'go']),
  problem: z.string(),
  inputDescription: z.string().optional(),
  outputDescription: z.string().optional(),
  constraints: z.array(z.string()).optional(),
  starterCode: z.string(),
  solutionCode: z.string(),
  testCases: z.array(z.object({
    input: z.string(),
    expected: z.string(),
  })),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  hints: z.array(z.string()).optional(),
});

/**
 * Schema for enhanced checkpoint with full content
 */
export const EnhancedCheckpointSchema = z.object({
  timestamp: z.number(),
  type: z.enum(['quiz', 'flashcard', 'code_challenge']),
  title: z.string(),
  content: z.union([
    z.object({
      type: z.literal('quiz'),
      question: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number(),
      explanation: z.string(),
    }),
    z.object({
      type: z.literal('flashcard'),
      front: z.string(),
      back: z.string(),
      hint: z.string().optional(),
    }),
    z.object({
      type: z.literal('code_challenge'),
      language: z.enum(['javascript', 'python', 'typescript', 'sql', 'java', 'cpp', 'go']),
      problem: z.string(),
      inputDescription: z.string().optional(),
      outputDescription: z.string().optional(),
      constraints: z.array(z.string()).optional(),
      starterCode: z.string(),
      solutionCode: z.string(),
      testCases: z.array(z.object({
        input: z.string(),
        expected: z.string(),
      })),
      difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
      hints: z.array(z.string()).optional(),
    }),
  ]),
});

/**
 * Schema for AI-organized notes
 * Validates that AI output preserves verbatim learner text
 */
export const OrganizedNotesSchema = z.object({
  sections: z.array(z.object({
    /** Section type identifier */
    type: z.enum(['main_ideas', 'examples', 'unclear_points', 'repeated_ideas']),
    /** Human-readable label */
    label: z.string(),
    /** Items in this section */
    items: z.array(z.object({
      /** Must be verbatim text from original note */
      text: z.string(),
      /** Original timestamp in seconds */
      timestamp: z.number(),
      /** Reference to original note ID */
      noteId: z.string(),
    })),
  })),
});

/**
 * Schema for practice resource checkpoints (LeetCode, HackerRank, etc.)
 * Used for smart learning checkpoints that suggest relevant problems.
 */
export const PracticeResourceSchema = z.object({
  type: z.literal('practice_resource'),
  platform: z.enum(['leetcode', 'hackerrank', 'codewars']),
  problemId: z.string(),
  title: z.string(),
  url: z.string().url(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  matchConfidence: z.number().min(0).max(1),
  matchReason: z.string(),
});

// ============================================================================
// Adaptive Checkpoint Schemas (V3)
// ============================================================================

/**
 * Universal Fixed Set of Capabilities
 * "What is the learner now capable of doing?"
 */
export const CapabilityTypeSchema = z.enum([
  'identify',
  'explain_in_own_words',
  'predict_output',
  'perform_step',
  'configure_parameters',
  'trace_process',
  'spot_mistake',
  'apply_to_context',
]);

/**
 * Execution Environments available in the side panel
 */
export const CheckpointRunnerSchema = z.enum([
  'sqljs',           // SQLite in browser
  'monaco_judge0',   // Monaco editor + Judge0 backend (or similar)
  'handsontable',    // Spreadsheet
  'external',        // Open external IDE/Tool
]);

/**
 * High-level checkpoint content type
 */
export const CheckpointTypeSchema = z.enum(['code', 'sql', 'spreadsheet', 'theory']);

/**
 * Strict JSON Contract for Checkpoint Payload
 * This is what the UI receives to render the interaction.
 */
export const CheckpointPayloadSchema = z.object({
  timestamp: z.number(),
  type: CheckpointTypeSchema,
  title: z.string().describe("Short, precise task title"),
  task: z.string().describe("1–2 sentence actionable instruction"),
  starter: z.string().optional().describe("starter code / dataset / config"),
  runner: CheckpointRunnerSchema,
  hint: z.string().optional().describe("single short hint"),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  duration_estimate_min: z.number().min(1).max(15),
});

/**
 * Detected Teaching Moment from Transcript
 */
export const TeachingMomentSchema = z.object({
  range: z.object({
    start: z.number(),
    end: z.number(),
  }),
  intent: z.enum([
    'concept_explanation', 
    'demonstration', 
    'example', 
    'procedure_step', 
    'summary', 
    'aside'
  ]),
  confidence: z.number(),
  transcript_text: z.string(),
});

// ============================================================================
// PHASE 2: Adaptive Checkpoint Generation Schemas
// ============================================================================

/**
 * Embedded Code Editor Configuration
 */
export const EmbeddedEditorSchema = z.object({
  language: z.enum(['javascript', 'python', 'typescript', 'sql', 'java', 'cpp', 'go']),
  starterCode: z.string(),
  testCases: z.array(z.object({
    input: z.any(),
    expected: z.any(),
    description: z.string().optional(),
  })).optional(),
  hints: z.array(z.string()).optional(),
  buggyCode: z.string().optional(), // For DEBUG_CHALLENGE type
  solution: z.string().optional(),
});

/**
 * Quiz Question Schema
 */
export const AdaptiveQuizSchema = z.object({
  question: z.string(),
  options: z.array(z.object({
    id: z.string(),
    text: z.string(),
    isCorrect: z.boolean(),
  })),
  explanation: z.string(),
  incorrectFeedback: z.record(z.string(), z.string()).optional(),
});

/**
 * Checkpoint Adaptive Rules
 */
export const AdaptiveRulesSchema = z.object({
  onSuccess: z.enum(['INCREASE_DIFFICULTY', 'NEXT_CHECKPOINT', 'BONUS_CHALLENGE']).optional(),
  onFailure: z.enum(['PROVIDE_GUIDED_SOLUTION', 'REDUCE_DIFFICULTY', 'OFFER_HINT']).optional(),
  onSkip: z.enum(['MARK_FOR_LATER_REVIEW', 'SHOW_SUMMARY', 'NO_ACTION']).optional(),
});

/**
 * Adaptive Checkpoint Type Enum
 */
export const AdaptiveCheckpointTypeSchema = z.enum([
  'CODE_PRACTICE',      // Implement code from scratch
  'DEBUG_CHALLENGE',    // Find and fix bugs
  'CONCEPT_QUIZ',       // Multiple choice quiz
  'DESIGN_PRACTICE',    // Color palettes, font pairing, etc.
  'CRITIQUE_CHALLENGE', // Analyze and annotate designs
  'REFLECTION',         // Free-form text reflection
  'KNOWLEDGE_CHECK',    // Drag-and-drop, ordering, matching
]);

/**
 * Single Adaptive Checkpoint Schema
 */
export const AdaptiveCheckpointItemSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  type: AdaptiveCheckpointTypeSchema,
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  title: z.string(),
  context: z.string(),
  estimatedTime: z.string(), // e.g., "5-8 minutes"
  difficulty: z.enum(['easy', 'medium', 'hard']),
  
  // Type-specific content (one of these will be present)
  embeddedEditor: EmbeddedEditorSchema.optional(),
  quiz: AdaptiveQuizSchema.optional(),
  reflectionPrompt: z.object({
    question: z.string(),
    characterLimit: z.number().optional(),
    followUp: z.string().optional(),
  }).optional(),
  
  // Metadata
  metadata: z.object({
    prerequisiteCheckpoints: z.array(z.string()).optional(),
    unlocks: z.array(z.string()).optional(),
    videoSegmentCovered: z.string().optional(),
    learningObjective: z.string(),
    adaptiveRules: AdaptiveRulesSchema.optional(),
  }),
});

/**
 * Full Adaptive Checkpoint Generation Response Schema
 */
export const AdaptiveCheckpointGenerationSchema = z.object({
  videoId: z.string(),
  analysisMetadata: z.object({
    detectedDomain: z.enum(['coding', 'design', 'general', 'business']),
    subDomain: z.string().optional(),
    skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),
    totalCheckpoints: z.number(),
    estimatedTotalPracticeTime: z.string(),
    aiConfidence: z.number().min(0).max(1),
  }),
  checkpoints: z.array(AdaptiveCheckpointItemSchema),
  learningPath: z.object({
    currentVideo: z.string(),
    suggestedNext: z.array(z.string()).optional(),
    prerequisiteTopics: z.array(z.string()).optional(),
  }).optional(),
});

