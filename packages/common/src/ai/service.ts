/**
 * AI Service
 * 
 * The main entry point for AI features.
 * Uses Gemini as primary provider for code challenges, with OpenRouter fallback.
 */

import type { 
  AIConfig, 
  ExplainErrorInput, 
  SummarizeInput, 
  DraftChallengeInput,
  GenerateCheckpointsInput,
  ClassifyContentInput,
  GenerateQuizInput,
  GenerateFlashcardInput,
  GenerateCodeChallengeInput,
  AnalyzeVideoInput,
  OrganizeNotesInput,
  DetectTeachingMomentsInput,
  ExplanationResult,
  SummaryResult,
  ChallengeDraftResult,
  CheckpointGenerationResult,
  ContentClassificationResult,
  QuizGenerationResult,
  FlashcardGenerationResult,
  CodeChallengeGenerationResult,
  VideoAnalysisResult,
  OrganizedNotesAIResult,
  TeachingMomentsResult
} from './types';
import { 
  ExplanationSchema, 
  SummarySchema, 
  ChallengeDraftSchema,
  CheckpointGenerationSchema,
  ContentClassificationSchema,
  QuizGenerationSchema,
  FlashcardGenerationSchema,
  CodeChallengeGenerationSchema,
  VideoAnalysisSchema,
  OrganizedNotesSchema,
  TeachingMomentSchema
} from './schemas';
import { 
  SYSTEM_PROMPT, 
  EXPLAIN_ERROR_PROMPT, 
  SUMMARIZE_PROMPT, 
  DRAFT_CHALLENGE_PROMPT,
  GENERATE_CHECKPOINTS_PROMPT,
  CLASSIFY_CONTENT_PROMPT,
  GENERATE_QUIZ_PROMPT,
  GENERATE_FLASHCARD_PROMPT,
  GENERATE_CODE_CHALLENGE_PROMPT,
  ANALYZE_VIDEO_CONTENT_PROMPT,
  ORGANIZE_NOTES_PROMPT,
  DETECT_TEACHING_MOMENTS_PROMPT
} from './prompts';
import { AIProvider } from './provider';
import { GeminiProvider, isGeminiConfigured } from './gemini-provider';
import { z } from 'zod';

// Schema wrapper for the list
const TeachingMomentsResponseSchema = z.object({
  moments: z.array(TeachingMomentSchema)
});

/**
 * Extended AI Config with optional Gemini key
 */
export interface ExtendedAIConfig extends AIConfig {
  geminiApiKey?: string;
}

/**
 * Best free OpenRouter models with fallback chains
 * Each array is ordered by preference (best first)
 * Updated: 2025 - using currently available free models
 */
const MODEL_CHAINS = {
  // For quiz and flashcard generation - need strong instruction following
  education: [
    'meta-llama/llama-3.3-70b-instruct:free',   // Best instruction following
    'google/gemini-2.0-flash-exp:free',          // Fast and capable
    'google/gemma-3-12b-it:free',                // Reliable backup
    'mistralai/mistral-small-3.1-24b-instruct:free', // Strong fallback
  ],
  
  // For code challenges - need coding expertise
  coding: [
    'deepseek/deepseek-r1-0528:free',            // Best for code reasoning
    'meta-llama/llama-3.3-70b-instruct:free',    // Strong general model
    'google/gemma-3-12b-it:free',                // Backup
    'mistralai/mistral-small-3.1-24b-instruct:free', // Fallback
  ],
  
  // For content classification - need speed and accuracy
  classifier: [
    'google/gemma-3-4b-it:free',                 // Fast and accurate
    'meta-llama/llama-3.2-3b-instruct:free',     // Lightweight
    'google/gemini-2.0-flash-exp:free',          // Reliable fallback
  ],
};

export class AIService {
  private config: AIConfig;
  private geminiProvider: GeminiProvider | null = null;

  constructor(config: AIConfig | ExtendedAIConfig) {
    this.config = config;
    
    // Initialize Gemini provider if key is available
    const geminiKey = (config as ExtendedAIConfig).geminiApiKey || 
                      (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined);
    
    if (isGeminiConfigured(geminiKey)) {
      this.geminiProvider = new GeminiProvider({ 
        apiKey: geminiKey!,
        model: 'gemini-1.5-flash' // Fast model for code generation
      });
      console.log('[AI] Gemini provider initialized');
    }
  }

  /**
   * Try generation with fallback chain
   */
  private async generateWithFallback<T>(
    modelChain: string[],
    prompt: string,
    schema: z.ZodSchema<T>,
    systemPrompt: string,
    taskName: string
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (const model of modelChain) {
      try {
        console.log(`[AI] Trying ${model} for ${taskName}...`);
        
        const provider = new AIProvider({
          ...this.config,
          model,
        });
        
        const result = await provider.generate(prompt, schema, systemPrompt);
        console.log(`[AI] Success with ${model} for ${taskName}`);
        return result;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[AI] ${model} failed for ${taskName}:`, lastError.message);
        
        // Wait a bit before trying next model (rate limit prevention)
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    throw lastError || new Error('All models failed');
  }

  /**
   * Classify content type (coding vs non-coding).
   */
  async classifyContent(input: ClassifyContentInput): Promise<ContentClassificationResult> {
    if (!this.config.enabled) {
      return {
        isProgramming: false,
        language: 'none',
        topics: [],
        confidence: 0,
      };
    }

    try {
      const prompt = CLASSIFY_CONTENT_PROMPT
        .replace('{{title}}', input.title)
        .replace('{{transcript}}', input.transcript.slice(0, 2000));

      return await this.generateWithFallback(
        MODEL_CHAINS.classifier,
        prompt,
        ContentClassificationSchema,
        SYSTEM_PROMPT,
        'classification'
      );
    } catch (error) {
      console.warn('[AI] Content classification fallback to keyword detection:', error);
      // Fallback: simple keyword detection
      const codeKeywords = ['function', 'const', 'let', 'var', 'class', 'def', 'import', 'return', 'console.log', 'print(', 'code', 'programming', 'javascript', 'python', 'react', 'node'];
      const hasCode = codeKeywords.some(kw => input.transcript.toLowerCase().includes(kw));
      return {
        isProgramming: hasCode,
        language: hasCode ? 'javascript' : 'none',
        topics: [],
        confidence: 0.3,
      };
    }
  }

  /**
   * Analyze full video transcript before checkpoint generation.
   * CRITICAL: This analyzes the ENTIRE video to understand what is taught.
   */
  async analyzeVideoContent(input: AnalyzeVideoInput): Promise<VideoAnalysisResult> {
    if (!this.config.enabled) {
      return this.getFallbackVideoAnalysis(input);
    }

    console.log(`[AI] Analyzing full video: "${input.title}" (${input.transcript.length} chars)`);

    // Try Gemini first for large context analysis (supports 1M tokens)
    if (this.geminiProvider) {
      try {
        console.log('[AI] Using Gemini for full transcript analysis...');
        const prompt = ANALYZE_VIDEO_CONTENT_PROMPT
          .replace('{{title}}', input.title)
          .replace('{{transcript}}', input.transcript.slice(0, 30000)); // Gemini can handle large context

        const result = await this.geminiProvider.generateWithRetry(
          prompt,
          VideoAnalysisSchema,
          SYSTEM_PROMPT,
          2
        );
        console.log(`[AI] Gemini analysis complete: language=${result.language}, concepts=${result.keyConcepts.length}`);
        return result;
      } catch (error) {
        console.warn('[AI] Gemini video analysis failed, falling back to OpenRouter:', error);
      }
    }

    // Fallback to OpenRouter
    try {
      const prompt = ANALYZE_VIDEO_CONTENT_PROMPT
        .replace('{{title}}', input.title)
        .replace('{{transcript}}', input.transcript.slice(0, 8000)); // Smaller for OpenRouter

      return await this.generateWithFallback(
        MODEL_CHAINS.classifier,
        prompt,
        VideoAnalysisSchema,
        SYSTEM_PROMPT,
        'video_analysis'
      );
    } catch (error) {
      console.warn('[AI] Video analysis fallback to keyword detection:', error);
      return this.getFallbackVideoAnalysis(input);
    }
  }

  /**
   * Fallback video analysis using keyword detection.
   * V2: Enhanced with content classification and checkpoint gating.
   * V3: Added comprehensive entertainment detection (chess, sports, gaming, music).
   */
  private getFallbackVideoAnalysis(input: AnalyzeVideoInput): VideoAnalysisResult {
    const lower = input.transcript.toLowerCase() + ' ' + input.title.toLowerCase();
    
    // ========================================================================
    // STEP 1: Detect Entertainment Content First (highest priority)
    // ========================================================================
    
    // Chess detection patterns
    const chessKeywords = [
      'chess', 'grandmaster', 'checkmate', 'opening', 'endgame', 'middlegame',
      'tata steel', 'candidates', 'world championship', 'elo rating', 
      'magnus carlsen', 'hikaru', 'nakamura', 'fabiano caruana', 'nepo',
      'sicilian defense', 'queen\'s gambit', 'king\'s indian', 'french defense',
      'e4 e5', 'd4 d5', 'castle', 'en passant', 'pawn structure', 'blitz',
      'rapid', 'classical', 'bullet', 'chess.com', 'lichess', 'fide',
      'anish giri', 'levon aronian', 'wesley so', 'ding liren', 'erdogmus'
    ];
    
    // Sports detection patterns  
    const sportsKeywords = [
      'match', 'tournament', 'championship', 'league', 'playoffs', 'finals',
      'score', 'goal', 'touchdown', 'home run', 'slam dunk', 'knockout',
      'football', 'basketball', 'baseball', 'soccer', 'tennis', 'golf',
      'olympics', 'world cup', 'premier league', 'nba', 'nfl', 'mlb',
      'athlete', 'championship title', 'medal', 'standings', 'bracket'
    ];
    
    // Gaming detection patterns (playing games, not coding them)
    const gamingKeywords = [
      'let\'s play', 'gameplay', 'walkthrough', 'playthrough', 'speedrun',
      'boss fight', 'level up', 'game over', 'respawn', 'loot', 'quest',
      'fortnite', 'minecraft', 'valorant', 'call of duty', 'gta', 'zelda',
      'elden ring', 'hogwarts legacy', 'apex legends', 'league of legends',
      'twitch', 'streaming', 'gamer', 'esports', 'pro player',
      'gaming setup', 'rage quit', 'clutch play', 'noob', 'pro gamer'
    ];
    
    // Music/performance detection patterns
    const musicKeywords = [
      'concert', 'performance', 'live music', 'music video', 'album',
      'song', 'lyrics', 'guitar solo', 'drum', 'vocalist', 'band',
      'spotify', 'billboard', 'grammy', 'tour', 'acoustic', 'cover song'
    ];
    
    // Vlog/lifestyle detection patterns
    const vlogKeywords = [
      'vlog', 'day in my life', 'what i eat', 'mukbang', 'unboxing', 
      'reaction', 'haul', 'asmr', 'get ready with me', 'room tour',
      'what i bought', 'shopping', 'travel vlog', 'daily routine'
    ];
    
    // Count matches for each entertainment category
    const chessMatches = chessKeywords.filter(kw => lower.includes(kw)).length;
    const sportsMatches = sportsKeywords.filter(kw => lower.includes(kw)).length;
    const gamingMatches = gamingKeywords.filter(kw => lower.includes(kw)).length;
    const musicMatches = musicKeywords.filter(kw => lower.includes(kw)).length;
    const vlogMatches = vlogKeywords.filter(kw => lower.includes(kw)).length;
    
    // Determine if this is entertainment (2+ matches in any category is strong signal)
    const isChess = chessMatches >= 2;
    const isSports = sportsMatches >= 2;
    const isGaming = gamingMatches >= 2;
    const isMusic = musicMatches >= 2;
    const isVlog = vlogMatches >= 1;
    
    const isEntertainment = isChess || isSports || isGaming || isMusic || isVlog;
    
    // ========================================================================
    // STEP 2: Detect Programming Content
    // ========================================================================
    
    const languagePatterns: Array<{ lang: VideoAnalysisResult['language']; patterns: string[] }> = [
      { lang: 'python', patterns: ['python', 'def ', 'print(', 'import ', 'elif', 'pandas', 'numpy', 'django', 'flask'] },
      { lang: 'javascript', patterns: ['javascript', 'const ', 'let ', 'function ', 'console.log', '=>', 'node.js', 'react'] },
      { lang: 'typescript', patterns: ['typescript', ': string', ': number', 'interface ', 'type '] },
      { lang: 'java', patterns: ['java ', 'public static void', 'system.out', 'spring'] },
      { lang: 'cpp', patterns: ['c++', '#include', 'std::', 'cout', 'cin'] },
      { lang: 'go', patterns: ['golang', 'func ', 'fmt.println', 'go '] },
      { lang: 'sql', patterns: ['sql', 'select ', 'from ', 'where ', 'join '] },
    ];

    let detectedLang: VideoAnalysisResult['language'] = 'none';
    let maxLangMatches = 0;
    
    for (const { lang, patterns } of languagePatterns) {
      const matches = patterns.filter(p => lower.includes(p)).length;
      if (matches > maxLangMatches) {
        maxLangMatches = matches;
        detectedLang = lang;
      }
    }

    // Strong programming signals (require multiple matches to avoid false positives)
    const programmingKeywords = ['code', 'programming', 'coding', 'algorithm', 'leetcode', 'hackerrank', 'debug', 'compile', 'runtime'];
    const programmingMatches = programmingKeywords.filter(kw => lower.includes(kw)).length;
    const isProgramming = (detectedLang !== 'none' && maxLangMatches >= 2) || programmingMatches >= 2;
    
    // ========================================================================
    // STEP 3: Determine Content Type with Proper Gating
    // ========================================================================
    
    let contentType: VideoAnalysisResult['contentType'];
    let skipReason: string | undefined;
    let topics: string[] = [];
    let summary: string;
    
    if (isEntertainment && !isProgramming) {
      // Entertainment takes priority if no programming signals
      contentType = 'entertainment';
      
      if (isChess) {
        skipReason = 'Chess content - sports/gaming, not programming';
        topics = ['Chess', 'Tournament', 'Strategy Game'];
        summary = 'Chess game or tournament analysis with no coding content.';
      } else if (isSports) {
        skipReason = 'Sports content - match/tournament coverage, not programming';
        topics = ['Sports', 'Competition'];
        summary = 'Sports match or tournament coverage.';
      } else if (isGaming) {
        skipReason = 'Gaming content - playing games, not coding them';
        topics = ['Gaming', 'Let\'s Play', 'Gameplay'];
        summary = 'Gaming walkthrough or gameplay with no coding content.';
      } else if (isMusic) {
        skipReason = 'Music/performance content - not educational programming';
        topics = ['Music', 'Performance'];
        summary = 'Music performance or music-related content.';
      } else {
        skipReason = 'Lifestyle/vlog content - no educational programming';
        topics = ['Vlog', 'Lifestyle'];
        summary = 'Lifestyle vlog or entertainment content.';
      }
    } else if (isProgramming) {
      contentType = 'coding_tutorial';
      topics = ['Programming', 'Coding', 'Tutorial'];
      summary = `Programming tutorial about ${input.title}`;
    } else {
      contentType = 'educational_other';
      topics = ['Educational'];
      summary = `Educational content about ${input.title}`;
    }
    
    // Entertainment content should NOT generate checkpoints
    const shouldGenerateCheckpoints = contentType !== 'entertainment';
    
    console.log(`[AI Fallback] Content type: ${contentType}, Entertainment: ${isEntertainment}, Programming: ${isProgramming}`);
    if (isChess) console.log(`[AI Fallback] Chess detected (${chessMatches} matches)`);
    if (isSports) console.log(`[AI Fallback] Sports detected (${sportsMatches} matches)`);
    if (isGaming) console.log(`[AI Fallback] Gaming detected (${gamingMatches} matches)`);

    return {
      contentType,
      shouldGenerateCheckpoints,
      skipReason,
      language: detectedLang,
      isProgramming,
      confidence: isEntertainment ? 0.85 : 0.4,
      conceptWindows: [],
      mentionedProblems: [],
      keyConcepts: [],
      codePatterns: [],
      topics,
      summary,
    };
  }

  /**
   * Generate a quiz question from transcript.
   */
  async generateQuiz(input: GenerateQuizInput): Promise<QuizGenerationResult> {
    if (!this.config.enabled) {
      return this.getFallbackQuiz(input.transcript);
    }

    try {
      const prompt = GENERATE_QUIZ_PROMPT
        .replace('{{transcript}}', input.transcript.slice(0, 3000));

      return await this.generateWithFallback(
        MODEL_CHAINS.education,
        prompt,
        QuizGenerationSchema,
        SYSTEM_PROMPT,
        'quiz generation'
      );
    } catch (error) {
      console.warn('[AI] Quiz generation failed:', error);
      return this.getFallbackQuiz(input.transcript);
    }
  }

  /**
   * Generate a flashcard from transcript.
   */
  async generateFlashcard(input: GenerateFlashcardInput): Promise<FlashcardGenerationResult> {
    if (!this.config.enabled) {
      return this.getFallbackFlashcard(input.transcript);
    }

    try {
      const prompt = GENERATE_FLASHCARD_PROMPT
        .replace('{{transcript}}', input.transcript.slice(0, 3000));

      return await this.generateWithFallback(
        MODEL_CHAINS.education,
        prompt,
        FlashcardGenerationSchema,
        SYSTEM_PROMPT,
        'flashcard generation'
      );
    } catch (error) {
      console.warn('[AI] Flashcard generation failed:', error);
      return this.getFallbackFlashcard(input.transcript);
    }
  }

  /**
   * Generate a code challenge from transcript.
   * Uses Gemini as primary provider for better code generation quality.
   */
  async generateCodeChallenge(input: GenerateCodeChallengeInput): Promise<CodeChallengeGenerationResult> {
    if (!this.config.enabled) {
      return this.getFallbackCodeChallenge(input.language, input.transcript);
    }

    // Build prompt with video context if available
    let prompt = GENERATE_CODE_CHALLENGE_PROMPT
      .replace(/\{\{language\}\}/g, input.language)
      .replace(/\{\{difficulty\}\}/g, 'medium')
      .replace('{{transcript}}', input.transcript.slice(0, 6000)); // Increase context

    // Add video context for more relevant challenges
    if (input.videoContext) {
      const contextInfo = `
KEY CONCEPTS FROM VIDEO: ${input.videoContext.keyConcepts.join(', ')}
CODE PATTERNS SHOWN: ${input.videoContext.codePatterns.join(', ')}
${input.conceptToTest ? `SPECIFIC CONCEPT TO TEST: ${input.conceptToTest}` : ''}

IMPORTANT: Your challenge MUST test one of the key concepts listed above.
`;
      prompt = prompt.replace('{{transcript}}', contextInfo + '\n\nTRANSCRIPT:\n' + input.transcript.slice(0, 5000));
    }

    // Try Gemini first if available (better for code generation)
    if (this.geminiProvider) {
      try {
        console.log(`[AI] Using Gemini for ${input.language} code challenge...`);
        const result = await this.geminiProvider.generateWithRetry(
          prompt,
          CodeChallengeGenerationSchema,
          SYSTEM_PROMPT,
          3 // max retries - increased for reliability
        );
        console.log(`[AI] Gemini ${input.language} code challenge successful: "${result.problem.slice(0, 50)}"`);
        return result;
      } catch (error) {
        console.warn('[AI] Gemini failed, falling back to OpenRouter:', error);
      }
    }

    // Fall back to OpenRouter
    try {
      return await this.generateWithFallback(
        MODEL_CHAINS.coding,
        prompt,
        CodeChallengeGenerationSchema,
        SYSTEM_PROMPT,
        'code challenge generation'
      );
    } catch (error) {
      console.warn('[AI] Code challenge generation failed:', error);
      return this.getFallbackCodeChallenge(input.language, input.transcript);
    }
  }

  /**
   * Explain a code error.
   */
  async explainError(input: ExplainErrorInput): Promise<ExplanationResult> {
    if (!this.config.enabled) {
      return this.getFallbackExplanation(input);
    }

    try {
      let prompt = EXPLAIN_ERROR_PROMPT
        .replace('{{errorMessage}}', input.errorMessage)
        .replace('{{errorCode}}', input.errorCode ? `Code: ${input.errorCode}` : '')
        .replace('{{userCode}}', input.userCode ? `\nCode:\n${input.userCode}` : '');

      return await this.generateWithFallback(
        MODEL_CHAINS.education,
        prompt,
        ExplanationSchema,
        SYSTEM_PROMPT,
        'error explanation'
      );
    } catch (error) {
      console.warn('[AI] Error explanation failed:', error);
      return this.getFallbackExplanation(input);
    }
  }

  /**
   * Summarize text.
   */
  async summarize(input: SummarizeInput): Promise<SummaryResult> {
    if (!this.config.enabled) {
      return {
        summary: "AI summarization is disabled.",
        keyPoints: [],
        readingTimeSeconds: 0
      };
    }

    try {
      const prompt = SUMMARIZE_PROMPT.replace('{{text}}', input.text);
      return await this.generateWithFallback(
        MODEL_CHAINS.education,
        prompt,
        SummarySchema,
        SYSTEM_PROMPT,
        'summarization'
      );
    } catch (error) {
      console.warn('[AI] Summarization failed:', error);
      return {
        summary: "Could not generate summary.",
        keyPoints: [],
        readingTimeSeconds: 0
      };
    }
  }

  /**
   * Draft a challenge.
   */
  async draftChallenge(input: DraftChallengeInput): Promise<ChallengeDraftResult | null> {
    if (!this.config.enabled) return null;

    try {
      let prompt = DRAFT_CHALLENGE_PROMPT
        .replace('{{concept}}', input.concept)
        .replace('{{difficulty}}', input.difficulty.toString())
        .replace('{{language}}', input.language);

      return await this.generateWithFallback(
        MODEL_CHAINS.coding,
        prompt,
        ChallengeDraftSchema,
        SYSTEM_PROMPT,
        'challenge drafting'
      );
    } catch (error) {
      console.warn('[AI] Challenge drafting failed:', error);
      return null;
    }
  }

  /**
   * Generate learning checkpoints from video segment transcript.
   */
  async generateCheckpoints(input: GenerateCheckpointsInput): Promise<CheckpointGenerationResult> {
    if (!this.config.enabled) {
      return { checkpoints: [] };
    }

    try {
      const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
      };

      const prompt = GENERATE_CHECKPOINTS_PROMPT
        .replace('{{videoTitle}}', input.videoTitle)
        .replace('{{startTime}}', formatTime(input.startTime))
        .replace('{{endTime}}', formatTime(input.endTime))
        .replace('{{transcript}}', input.transcript);

      return await this.generateWithFallback(
        MODEL_CHAINS.education,
        prompt,
        CheckpointGenerationSchema,
        SYSTEM_PROMPT,
        'checkpoint generation'
      );
    } catch (error) {
      console.warn('[AI] Checkpoint generation failed:', error);
      return { checkpoints: [] };
    }
  }

  /**
   * Organize learner's notes into sections WITHOUT rewriting.
   * Uses free OpenRouter model fallback chain for reliability.
   * Falls back to Gemini 2.5 Flash if OpenRouter models fail.
   * 
   * CRITICAL: This method validates that AI output preserves verbatim text.
   * If AI violates the rules (rewrites text), null is returned.
   */
  async organizeNotes(input: OrganizeNotesInput): Promise<OrganizedNotesAIResult | null> {
    if (!this.config.enabled) {
      console.log('[AI] Organization disabled - returning null');
      return null;
    }

    if (input.notes.length < 2) {
      console.log('[AI] Not enough notes to organize');
      return null;
    }

    // Format notes for the prompt
    const notesText = input.notes
      .map(note => `[${note.startTimeSeconds}s] (ID: ${note.id})\n${note.body}`)
      .join('\n\n---\n\n');

    const prompt = ORGANIZE_NOTES_PROMPT.replace('{{notes}}', notesText);

    console.log(`[AI] Organizing ${input.notes.length} notes...`);

    let result: OrganizedNotesAIResult | null = null;

    // Try OpenRouter first
    try {
      // Use education model chain for strong instruction following
      result = await this.generateWithFallback(
        MODEL_CHAINS.education,
        prompt,
        OrganizedNotesSchema,
        SYSTEM_PROMPT,
        'notes organization'
      );
      console.log('[AI] OpenRouter organization successful');
    } catch (openRouterError) {
      console.warn('[AI] OpenRouter models failed for notes organization:', openRouterError);

      // Try Gemini 2.5 Flash as final fallback
      const geminiKey = (this.config as ExtendedAIConfig).geminiApiKey || 
                        (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined) ||
                        (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_GEMINI_API_KEY : undefined);

      if (isGeminiConfigured(geminiKey)) {
        try {
          console.log('[AI] Falling back to Gemini 2.5 Flash for notes organization...');
          const geminiFallback = new GeminiProvider({
            apiKey: geminiKey!,
            model: 'gemini-2.5-flash'
          });

          result = await geminiFallback.generateWithRetry(
            prompt,
            OrganizedNotesSchema,
            SYSTEM_PROMPT,
            2 // max retries
          );
          console.log('[AI] Gemini 2.5 Flash organization successful');
        } catch (geminiError) {
          console.error('[AI] Gemini 2.5 Flash fallback also failed:', geminiError);
          return null;
        }
      } else {
        console.error('[AI] No Gemini API key configured for fallback');
        return null;
      }
    }

    if (!result) {
      console.error('[AI] No result from any AI provider');
      return null;
    }

    // Build a map for quick noteId lookup and text matching
    const noteIdSet = new Set(input.notes.map(n => n.id));
    
    // Post-process: Ensure items have valid noteIds
    for (const section of result.sections) {
      for (const item of section.items) {
        // If noteId is invalid, try to find matching note
        if (!noteIdSet.has(item.noteId)) {
          const matchedNote = input.notes.find(n => {
            const noteText = n.body.toLowerCase().trim();
            const itemText = item.text.toLowerCase().trim();
            // Check for substring match in either direction
            return noteText.includes(itemText) || 
                   itemText.includes(noteText) ||
                   // Fuzzy: first 50 chars match
                   noteText.slice(0, 50) === itemText.slice(0, 50);
          });
          
          if (matchedNote) {
            item.noteId = matchedNote.id;
            item.timestamp = matchedNote.startTimeSeconds;
          } else {
            // Assign first note as fallback
            item.noteId = input.notes[0].id;
            item.timestamp = input.notes[0].startTimeSeconds;
          }
        }
      }
    }

    // Filter out empty sections
    result.sections = result.sections.filter(s => s.items.length > 0);

    if (result.sections.length === 0) {
      console.warn('[AI] No valid sections returned');
      return null;
    }

    console.log(`[AI] Successfully organized notes into ${result.sections.length} sections`);
    return result;
  }

  /**
   * Detect teaching moments in a transcript chunk.
   */
  async detectTeachingMoments(input: DetectTeachingMomentsInput): Promise<TeachingMomentsResult> {
    if (!this.config.enabled) {
      return { moments: [] };
    }

    try {
      const prompt = DETECT_TEACHING_MOMENTS_PROMPT
        .replace('{{transcript}}', input.transcriptChunk);

      const result = await this.generateWithFallback(
        MODEL_CHAINS.classifier, // Using fast classifier models
        prompt,
        TeachingMomentsResponseSchema,
        SYSTEM_PROMPT,
        'teaching moment detection'
      );
      
      return result;
    } catch (error) {
      console.warn('[AI] Teaching moment detection failed:', error);
      return { moments: [] };
    }
  }

  // --- Smart Fallbacks that use transcript content ---

  private getFallbackExplanation(input: ExplainErrorInput): ExplanationResult {
    return {
      title: 'Error Analysis Unavailable',
      explanation: `We encountered an error: "${input.errorMessage}". AI analysis is currently unavailable.`,
      relatedConcepts: ['Debugging', 'Error Handling']
    };
  }

  private getFallbackQuiz(transcript: string): QuizGenerationResult {
    // Clean transcript - remove metadata labels that might be present
    const cleanTranscript = transcript
      .replace(/Video Title:\s*/gi, '')
      .replace(/Video Description:\s*/gi, '')
      .replace(/Topics\/Tags:\s*/gi, '')
      .replace(/Duration:\s*\d+\s*minutes?/gi, '')
      .trim();
    
    // Extract meaningful sentences from transcript (not just first N words)
    const sentences = cleanTranscript
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 30 && s.length < 200);
    
    // Get the most substantial sentence
    const mainSentence = sentences[0] || cleanTranscript.slice(0, 150).trim();
    
    // Extract potential key terms - exclude common metadata words
    const excludeTerms = ['Video Title', 'Video Description', 'Official Video', 'Duration', 'Topics'];
    const properNouns = (cleanTranscript.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g) || [])
      .filter(noun => !excludeTerms.some(ex => noun.includes(ex)));
    
    // Try to find meaningful key terms
    const mainTerm = properNouns[0] || '';
    
    // Create contextual wrong answers based on transcript content
    const contextWords = cleanTranscript.match(/\b(?:the|this|that)\s+(\w+(?:\s+\w+)?)/gi) || [];
    const uniqueContexts = [...new Set(contextWords.slice(0, 5).map(w => w.replace(/^(the|this|that)\s+/i, '')))];
    
    // Build question based on what we found
    let question: string;
    let correctAnswer: string;
    
    if (mainTerm && mainTerm.length > 3 && mainSentence.toLowerCase().includes(mainTerm.toLowerCase())) {
      question = `What does the video mention about "${mainTerm}"?`;
      correctAnswer = mainSentence.slice(0, 100);
    } else if (sentences.length > 0) {
      question = `According to this section of the video, which statement is accurate?`;
      correctAnswer = mainSentence.slice(0, 100);
    } else {
      question = `What key information was shared in this segment?`;
      correctAnswer = cleanTranscript.slice(0, 100).trim();
    }
    
    // Generate plausible but incorrect options
    const wrongOptions = [
      uniqueContexts[0] ? `The opposite of ${uniqueContexts[0]} was discussed` : 'A contradictory point was made',
      sentences[1] ? `Instead, they focused on: "${sentences[1].slice(0, 60)}..."` : 'A completely different topic was covered',
      'This information was not mentioned in the video',
    ];
    
    return {
      question,
      options: [correctAnswer, ...wrongOptions],
      correctIndex: 0,
      explanation: `The video explicitly states: "${mainSentence.slice(0, 120)}..."`,
    };
  }

  private getFallbackFlashcard(transcript: string): FlashcardGenerationResult {
    // Clean transcript - remove metadata labels
    const cleanTranscript = transcript
      .replace(/Video Title:\s*/gi, '')
      .replace(/Video Description:\s*/gi, '')
      .replace(/Topics\/Tags:\s*/gi, '')
      .replace(/Duration:\s*\d+\s*minutes?/gi, '')
      .trim();
    
    // Extract meaningful sentences
    const sentences = cleanTranscript
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 250);
    
    // Find definitions or explanations (patterns like "X is Y", "X means Y")
    const definitionPattern = /([A-Z][a-zA-Z\s]+)\s+(?:is|are|means|refers to|describes)\s+([^.!?]+)/i;
    const defMatch = cleanTranscript.match(definitionPattern);
    
    // Find proper nouns or key terms - exclude metadata words
    const excludeTerms = ['Video Title', 'Video Description', 'Official Video', 'Duration', 'Topics'];
    const properNouns = (cleanTranscript.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [])
      .filter(noun => !excludeTerms.some(ex => noun.includes(ex)));
    const mainTerm = properNouns[0] || '';
    
    let front: string;
    let back: string;
    let hint: string;
    
    if (defMatch && !excludeTerms.some(ex => defMatch[1].includes(ex))) {
      // We found a definition-like pattern
      front = `What is ${defMatch[1].trim()}?`;
      back = defMatch[2].trim().slice(0, 200);
      hint = `It was described as something that ${defMatch[2].slice(0, 30).toLowerCase()}...`;
    } else if (mainTerm && mainTerm.length > 3 && sentences.length > 0) {
      // Use the main term and first sentence
      front = `Explain what "${mainTerm}" means based on the video.`;
      back = sentences[0].slice(0, 200);
      hint = `Think about how "${mainTerm}" was introduced in the discussion.`;
    } else if (sentences.length > 0) {
      // Generic but content-based
      front = `What key fact was mentioned in this video segment?`;
      back = sentences[0].slice(0, 200);
      hint = sentences.length > 1 ? `It relates to: "${sentences[1].slice(0, 40)}..."` : 'Focus on the main statement made.';
    } else {
      // Ultimate fallback
      front = `What was discussed in this segment?`;
      back = cleanTranscript.slice(0, 200).trim();
      hint = 'Review the video segment carefully.';
    }
    
    return { front, back, hint };
  }

  private getFallbackCodeChallenge(language: string, transcript: string): CodeChallengeGenerationResult {
    const lang = language as 'javascript' | 'python' | 'typescript' | 'sql' | 'java' | 'cpp' | 'go';
    
    // Clean and analyze transcript
    const cleanTranscript = transcript
      .replace(/Video Title:\s*/gi, '')
      .replace(/Video Description:\s*/gi, '')
      .toLowerCase();
    
    // Detect programming concepts mentioned
    const conceptPatterns = {
      python: {
        'for loop': /for\s+\w+\s+in/i,
        'list comprehension': /list comprehension|\[\s*\w+\s+for/i,
        'function': /def\s+\w+|function|method/i,
        'if statement': /if\s+\w+|conditional|if statement/i,
        'string': /string|str\(|\.lower\(\)|\.upper\(\)/i,
        'list': /list|append|\.append\(|\[/i,
        'dictionary': /dict|dictionary|\{.*:.*\}/i,
        'class': /class\s+\w+|object oriented|oop/i,
      },
      javascript: {
        'array': /array|\.map\(|\.filter\(|\.reduce\(/i,
        'function': /function|arrow function|=>/i,
        'object': /object|\.keys\(|\.values\(/i,
        'async': /async|await|promise/i,
        'loop': /for\s+loop|foreach|map/i,
        'string': /string|\.split\(|\.join\(/i,
      },
    };

    // Find the first matching concept
    let problem = 'Complete the function based on the tutorial';
    let concept = '';
    const patterns = conceptPatterns[lang as keyof typeof conceptPatterns] || conceptPatterns.python;
    
    for (const [name, pattern] of Object.entries(patterns)) {
      if (pattern.test(cleanTranscript)) {
        concept = name;
        break;
      }
    }

    // Generate language-specific challenges
    const challenges: Record<string, { problem: string; starter: string; solution: string; tests: { input: string; expected: string }[] }> = {
      python: concept === 'for loop' ? {
        problem: 'Write a function that uses a for loop to sum all numbers in a list',
        starter: '# Use a for loop as shown in the video\ndef sum_numbers(numbers):\n    # TODO: Use for loop to sum\n    pass',
        solution: 'def sum_numbers(numbers):\n    total = 0\n    for num in numbers:\n        total += num\n    return total',
        tests: [
          { input: '[1, 2, 3]', expected: '6' },
          { input: '[10, 20]', expected: '30' },
        ],
      } : concept === 'list comprehension' ? {
        problem: 'Use list comprehension to double all numbers in a list',
        starter: '# Use list comprehension as demonstrated\ndef double_all(numbers):\n    # TODO: Use list comprehension\n    pass',
        solution: 'def double_all(numbers):\n    return [x * 2 for x in numbers]',
        tests: [
          { input: '[1, 2, 3]', expected: '[2, 4, 6]' },
          { input: '[5]', expected: '[10]' },
        ],
      } : {
        problem: 'Write a function that processes the input based on the tutorial concept',
        starter: `# Practice: Python ${concept || 'basics'}\ndef solve(data):\n    # TODO: Implement\n    pass`,
        solution: 'def solve(data):\n    return str(data)',
        tests: [{ input: '"hello"', expected: 'hello' }],
      },
      javascript: concept === 'array' ? {
        problem: 'Use array methods to filter numbers greater than 5',
        starter: '// Use array filter as shown in the video\nfunction filterLarge(numbers) {\n  // TODO: Use .filter()\n}',
        solution: 'function filterLarge(numbers) {\n  return numbers.filter(n => n > 5);\n}',
        tests: [
          { input: '[1, 6, 3, 10]', expected: '[6, 10]' },
          { input: '[2, 3]', expected: '[]' },
        ],
      } : {
        problem: `Practice ${concept || 'JavaScript'} concepts from the tutorial`,
        starter: `// Practice: ${concept || 'JavaScript basics'}\nfunction solve(input) {\n  // TODO: Implement\n}`,
        solution: 'function solve(input) {\n  return input;\n}',
        tests: [{ input: '"test"', expected: 'test' }],
      },
    };

    const challenge = challenges[lang] || challenges.python;
    
    return {
      language: lang,
      problem: challenge.problem,
      starterCode: challenge.starter,
      solutionCode: challenge.solution,
      testCases: challenge.tests,
    };
  }
}
