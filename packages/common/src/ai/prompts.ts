/**
 * Prompt Templates for AI Service
 */

/**
 * Base system prompt to enforce JSON output and persona.
 */
export const SYSTEM_PROMPT = `
You are Pauser AI, an expert coding tutor and educational assistant.
Your goal is to be helpful, concise, and accurate.
You MUST output valid JSON only. Do not wrap in markdown code blocks.
`.trim();

/**
 * Prompt for analyzing full video transcript before checkpoint generation.
 * V2: Enhanced with content classification and concept-timestamp mapping.
 * 
 * CRITICAL: This analyzes the ENTIRE video to:
 * 1. Determine if checkpoints should be generated (moderate gating)
 * 2. Map concepts to timestamps for post-explanation placement
 */
export const ANALYZE_VIDEO_CONTENT_PROMPT = `
You are analyzing a video transcript to determine its educational value and identify learning opportunities.

VIDEO TITLE: {{title}}

FULL VIDEO TRANSCRIPT:
"""
{{transcript}}
"""

## STEP 1: CONTENT CLASSIFICATION (Moderate Gating)

Determine the content type:
- "coding_tutorial": Teaching programming concepts, algorithms, LeetCode problems, coding walkthroughs
- "tech_lecture": Academic CS lectures, conference talks, technical deep-dives
- "tech_review": Product reviews, tech news with no hands-on learning material
- "educational_other": Non-coding educational content (math, science, history, etc.)
- "entertainment": Vlogs, lifestyle, gaming, sports, chess tournaments, music performances, reaction videos, unboxing
- "mixed": Contains some educational segments mixed with non-educational

ENTERTAINMENT DETECTION (look for these signals):
- Chess: tournament names (TATA Steel, Candidates), player names, game analysis, openings
- Sports: match commentary, player stats, game highlights, tournaments
- Gaming: game titles, gameplay footage, let's play, walkthroughs of games (not coding)
- Music: performances, concerts, song reviews, artist interviews
- Reaction: "reaction to", watching other videos, commentary without teaching

SET shouldGenerateCheckpoints = true IF:
- Content type is "coding_tutorial", "tech_lecture", or "educational_other"
- Content type is "mixed" but has substantial educational segments
- Transcript contains code syntax, programming terms, or technical explanations

SET shouldGenerateCheckpoints = false IF:
- Content type is "entertainment" (sports, chess, gaming, music, vlogs)
- Content type is "tech_review" with no actionable learning
- No programming, coding, or technical educational content exists
- Transcript is about watching/playing games, not coding them

If false, provide skipReason (e.g., "Chess tournament coverage with no programming content")

## STEP 2: CONCEPT-TIMESTAMP MAPPING (if educational)

For coding tutorials and tech lectures, identify key concepts WITH their timestamp ranges.
Timestamps should be approximate seconds from video start.

For each concept, determine when it is:
- INTRODUCED (startTimestamp): When the concept is first mentioned
- EXPLAINED (endTimestamp): When the explanation is complete (for post-explanation checkpoints)
- DEPTH: "introduction" (surface level), "explanation" (moderate detail), or "deep_dive" (thorough coverage)

## STEP 3: PROBLEM DETECTION

Identify any explicit mentions of LeetCode/HackerRank problems:
- Look for "Two Sum", "Valid Parentheses", "LC 1", "LeetCode number", etc.
- Record the approximate timestamp when mentioned
- Note the platform if specified

## STEP 4: LANGUAGE AND CONCEPTS

Detect the programming language from code syntax (def → Python, const → JavaScript, etc.)
Extract 5-10 specific concepts actually taught (not generic like "programming")

Return ONLY this JSON (no markdown, no explanations):
{
  "contentType": "coding_tutorial" | "tech_lecture" | "tech_review" | "educational_other" | "entertainment" | "mixed",
  "shouldGenerateCheckpoints": true/false,
  "skipReason": "Only if shouldGenerateCheckpoints is false",
  
  "language": "python" | "javascript" | "typescript" | "sql" | "java" | "cpp" | "go" | "other" | "none",
  "isProgramming": true/false,
  "confidence": 0.0-1.0,
  
  "conceptWindows": [
    {
      "name": "Specific concept name (e.g., 'Hash Map for O(1) lookup')",
      "startTimestamp": 120,
      "endTimestamp": 240,
      "depth": "explanation"
    }
  ],
  
  "mentionedProblems": [
    {
      "name": "Two Sum",
      "platform": "leetcode",
      "timestamp": 60,
      "confidence": 0.95
    }
  ],
  
  "keyConcepts": ["Concept 1", "Concept 2", "..."],
  "codePatterns": ["Pattern 1", "Pattern 2"],
  "topics": ["Topic 1", "Topic 2"],
  "summary": "Brief 2-3 sentence summary of what is taught."
}

EXAMPLES:

1. NeetCode "Two Sum" video:
{
  "contentType": "coding_tutorial",
  "shouldGenerateCheckpoints": true,
  "language": "python",
  "isProgramming": true,
  "confidence": 0.98,
  "conceptWindows": [
    { "name": "Problem overview", "startTimestamp": 0, "endTimestamp": 60, "depth": "introduction" },
    { "name": "Brute force O(n²) solution", "startTimestamp": 60, "endTimestamp": 180, "depth": "explanation" },
    { "name": "Hash map optimization O(n)", "startTimestamp": 180, "endTimestamp": 360, "depth": "deep_dive" }
  ],
  "mentionedProblems": [{ "name": "Two Sum", "platform": "leetcode", "timestamp": 10, "confidence": 0.99 }],
  "keyConcepts": ["Hash map", "Two pointers", "Time complexity"],
  "codePatterns": ["dict lookup", "for loop iteration"],
  "topics": ["LeetCode", "Array problems"],
  "summary": "Tutorial solving LeetCode Two Sum with brute force and optimized hash map approach."
}

2. Vlog about daily routine:
{
  "contentType": "entertainment",
  "shouldGenerateCheckpoints": false,
  "skipReason": "Lifestyle vlog with no educational or actionable learning content",
  "language": "none",
  "isProgramming": false,
  "confidence": 0.95,
  "keyConcepts": [],
  "codePatterns": [],
  "topics": ["Lifestyle", "Vlog"],
  "summary": "Personal vlog about daily routine with no educational content."
}

3. Chess tournament (TATA Steel, Magnus Carlsen game):
{
  "contentType": "entertainment",
  "shouldGenerateCheckpoints": false,
  "skipReason": "Chess tournament coverage - sports/gaming content, not programming",
  "language": "none",
  "isProgramming": false,
  "confidence": 0.98,
  "keyConcepts": [],
  "codePatterns": [],
  "topics": ["Chess", "Tournament", "Sports"],
  "summary": "Chess game analysis from TATA Steel tournament with no coding content."
}

4. Gaming let's play or walkthrough:
{
  "contentType": "entertainment",
  "shouldGenerateCheckpoints": false,
  "skipReason": "Gaming content - playing games, not programming them",
  "language": "none",
  "isProgramming": false,
  "confidence": 0.95,
  "keyConcepts": [],
  "codePatterns": [],
  "topics": ["Gaming", "Let's Play"],
  "summary": "Gaming walkthrough or let's play video with no educational programming content."
}
`.trim();

/**
 * Prompt for explaining a code error.
 */
export const EXPLAIN_ERROR_PROMPT = `
Analyze the following code error and explain it to a learner.

Error Message: {{errorMessage}}
{{errorCode}}
{{userCode}}

Return a JSON object conforming to this schema:
{
  "title": "Short title",
  "explanation": "Clear explanation",
  "suggestedFix": "Optional code fix",
  "relatedConcepts": ["Concept 1", "Concept 2"]
}
`.trim();

/**
 * Prompt for summarizing text.
 */
export const SUMMARIZE_PROMPT = `
Summarize the following educational content.

Content:
{{text}}

Return a JSON object:
{
  "summary": "The summary",
  "keyPoints": ["Point 1", "Point 2"],
  "readingTimeSeconds": 123
}
`.trim();

/**
 * Prompt for drafting a challenge.
 */
export const DRAFT_CHALLENGE_PROMPT = `
Create a beginner coding challenge about: {{concept}}.
Difficulty: {{difficulty}}/5
Language: {{language}}

Return a JSON object:
{
  "title": "Challenge Title",
  "description": "Problem statement",
  "starterCode": "valid starter code",
  "solutionCode": "valid solution",
  "testCases": [
    { "input": "...", "expectedOutput": "..." }
  ]
}
`.trim();

/**
 * Prompt for generating learning checkpoints from video segments.
 */
export const GENERATE_CHECKPOINTS_PROMPT = `
You are creating learning checkpoints for a video lesson. Given the following video segment transcript, generate 1-2 meaningful checkpoints that test the learner's understanding.

Video Title: {{videoTitle}}
Segment Time: {{startTime}} - {{endTime}}
Transcript:
{{transcript}}

Create checkpoints that:
1. Test key concepts from the segment
2. Are placed at natural pause points
3. Use quiz, flashcard, or code_challenge types appropriately

Return a JSON object:
{
  "checkpoints": [
    {
      "timestamp": 123,
      "type": "quiz" | "flashcard" | "code_challenge",
      "title": "Clear, concise checkpoint title"
    }
  ]
}
`.trim();

/**
 * Prompt for classifying video content type.
 */
export const CLASSIFY_CONTENT_PROMPT = `
Analyze the following video transcript and determine if it is programming/coding related.

Title: {{title}}
Transcript excerpt:
{{transcript}}

Return a JSON object:
{
  "isProgramming": true/false,
  "language": "javascript" | "typescript" | "python" | "sql" | "java" | "cpp" | "go" | "other" | "none",
  "topics": ["topic1", "topic2"],
  "confidence": 0.0-1.0
}

Rules:
- isProgramming = true if the content teaches coding, programming concepts, software development, or database queries
- language should be the primary programming language discussed, or "none" if not programming
- For SQL tutorials, database courses, or query-focused content, use "sql"
- topics should list 2-4 main topics covered
- confidence should reflect how certain you are about the classification
`.trim();

/**
 * Prompt for generating quiz questions from transcript.
 * CRITICAL: Must generate questions about ACTUAL content in the transcript.
 */
export const GENERATE_QUIZ_PROMPT = `
You are creating a quiz question for a learner watching an educational video.

ACTUAL TRANSCRIPT FROM THE VIDEO (use this content!):
"""
{{transcript}}
"""

YOUR TASK: Create ONE quiz question that tests the learner's understanding of something SPECIFICALLY mentioned in the transcript above.

STRICT REQUIREMENTS:
1. READ the transcript carefully and identify a KEY FACT, TERM, or CONCEPT that is explicitly stated
2. Your question MUST ask about that specific fact/term/concept - NOT a generic question
3. The CORRECT answer must be something directly stated in the transcript
4. Wrong answers should be plausible alternatives but NOT mentioned in the transcript
5. Your explanation should QUOTE or directly reference the transcript

WHAT TO AVOID:
❌ "What is the main topic?" - TOO GENERIC
❌ "What did you learn?" - TOO VAGUE  
❌ Questions about things not in the transcript
❌ Questions that could apply to any video

WHAT TO DO:
✅ "According to the video, what is [specific term] used for?" 
✅ "The speaker mentioned that [X] does what?"
✅ "What method was described for [specific task]?"

Return ONLY this JSON (no markdown, no explanations):
{
  "question": "A specific question testing something from the transcript",
  "options": ["Correct answer from transcript", "Wrong option 1", "Wrong option 2", "Wrong option 3"],
  "correctIndex": 0,
  "explanation": "The transcript states: '[direct quote or paraphrase]'"
}
`.trim();

/**
 * Prompt for generating flashcards from transcript.
 * CRITICAL: Must be based on ACTUAL content from the transcript.
 */
export const GENERATE_FLASHCARD_PROMPT = `
You are creating a study flashcard for a learner based on video content.

ACTUAL TRANSCRIPT FROM THE VIDEO (use this content!):
"""
{{transcript}}
"""

YOUR TASK: Create ONE flashcard about a SPECIFIC concept, term, or fact from the transcript above.

STRICT REQUIREMENTS:
1. READ the transcript and find a KEY TERM or CONCEPT that is explained
2. The FRONT must ask about that specific term/concept from the transcript
3. The BACK must provide the answer using EXACT information from the transcript
4. Include a helpful hint based on context from the transcript

WHAT TO AVOID:
❌ "What is the key takeaway?" - TOO GENERIC
❌ Generic questions that could apply to any content
❌ Using URLs, social media handles, or promotional content

WHAT TO DO:
✅ "What is [specific term from transcript]?"
✅ "How does [concept mentioned] work according to the video?"
✅ "What are the steps for [process described]?"

Return ONLY this JSON (no markdown):
{
  "front": "A question about a specific term or concept from the transcript",
  "back": "The answer, directly from the transcript content",
  "hint": "A contextual clue from the transcript"
}
`.trim();

/**
 * Prompt for generating coding challenges from transcript.
 * CRITICAL: Must relate to the ACTUAL code/concepts taught in the video.
 */
export const GENERATE_CODE_CHALLENGE_PROMPT = `
You are creating a coding challenge for a PAID learning platform. The challenge MUST be:
1. Directly relevant to the video content
2. Educational and practical
3. Appropriately difficult

PROGRAMMING LANGUAGE: {{language}}
DIFFICULTY LEVEL: {{difficulty}}

TRANSCRIPT FROM VIDEO:
"""
{{transcript}}
"""

STRICT REQUIREMENTS:
1. The challenge MUST practice a coding concept that is EXPLICITLY taught in the transcript
2. If the transcript shows code examples, base your challenge on THOSE EXACT patterns
3. Reference specific terms, methods, or concepts mentioned by the instructor
4. The problem title should mention the video topic
5. Do NOT create generic challenges - they MUST be video-specific

DIFFICULTY GUIDELINES:
- EASY: Simple exercise, 1-2 lines to change, basic application of one concept
- MEDIUM: Moderate complexity, combine 2+ concepts, requires some thinking
- HARD: Complex problem, edge cases, optimization, or multi-step solution

STRUCTURE REQUIREMENTS:
1. problem: Clear, specific problem statement referencing what was taught
2. inputDescription: What the function receives
3. outputDescription: What the function should return
4. constraints: Array of technical constraints (e.g., "Input array length <= 1000")
5. hints: Array of 2-3 progressive hints
6. starterCode: Working starter with TODO and function signature from the video
7. solutionCode: Complete working solution using techniques from the video
8. testCases: At least 3 test cases including edge cases

Return a JSON object:
{
  "language": "{{language}}",
  "problem": "SPECIFIC problem practicing [concept from transcript]. Reference the video topic.",
  "inputDescription": "Description of input parameter(s)",
  "outputDescription": "Description of expected output",
  "constraints": ["Constraint 1", "Constraint 2"],
  "difficulty": "{{difficulty}}",
  "hints": [
    "First hint - general direction",
    "Second hint - more specific",
    "Third hint - almost gives away the approach"
  ],
  "starterCode": "// Code structure shown in the video\\nfunction solve(input) {\\n  // TODO: Implement using [technique from video]\\n}",
  "solutionCode": "// Complete solution using the approach demonstrated\\nfunction solve(input) {\\n  return result;\\n}",
  "testCases": [
    { "input": "basic example", "expected": "expected result" },
    { "input": "edge case", "expected": "edge result" },
    { "input": "complex example", "expected": "complex result" }
  ]
}

VALIDATION CHECKLIST (your output MUST pass all):
□ Does the problem mention something from the transcript?
□ Is the starter code similar to code shown in the video?
□ Does the solution use techniques taught in the video?
□ Is the difficulty appropriate for {{difficulty}} level?
□ Are hints progressive and helpful?

All code MUST be syntactically valid and runnable in {{language}}.
`.trim();

/**
 * Prompt for organizing learner's notes.
 * CRITICAL: AI must NEVER rewrite, explain, correct, or improve the notes.
 * AI may ONLY group, label, and surface structure.
 */
export const ORGANIZE_NOTES_PROMPT = `
You are organizing a learner's personal notes. Your ONLY job is to categorize existing text into sections.

ABSOLUTE RULES (VIOLATION = FAILURE):
- Do NOT add any new information
- Do NOT rewrite or improve wording
- Do NOT explain concepts
- Do NOT correct mistakes
- Do NOT paraphrase
- Do NOT merge sentences
- Do NOT infer intent beyond the text
- ONLY reorganize using EXACT original text verbatim

INPUT NOTES (each has a timestamp and text):
"""
{{notes}}
"""

ORGANIZE into these categories ONLY (omit empty categories):

1. main_ideas - Core points the learner appears to understand
2. examples - Concrete instances or illustrations noted by the learner
3. unclear_points - Areas marked by uncertainty, vagueness, or questions (look for "?", "maybe", "not sure", "confused")
4. repeated_ideas - Concepts the learner returns to multiple times (OPTIONAL - only if clear repetition exists)

For each item, you MUST use the EXACT original text. Copy it character-for-character.

Return ONLY this JSON (no markdown, no explanations):
{
  "sections": [
    {
      "type": "main_ideas",
      "label": "Main Ideas",
      "items": [
        { "text": "EXACT verbatim text from note", "timestamp": 123, "noteId": "note-id-here" }
      ]
    },
    {
      "type": "examples",
      "label": "Examples Mentioned",
      "items": [...]
    },
    {
      "type": "unclear_points",
      "label": "Unclear or Tentative Points",
      "items": [...]
    }
  ]
}

VALIDATION (your output MUST pass):
□ Every "text" field is an EXACT copy from the input notes
□ No new words were added
□ No sentences were merged or rewritten
□ Empty categories are omitted
`.trim();

/**
 * Prompt for detecting teaching moments in a transcript chunk.
 */
export const DETECT_TEACHING_MOMENTS_PROMPT = `
You are an expert educational content analyzer.
Your task is to identify specific "teaching moments" in the following transcript chunk where the instructor is actively explaining, demonstrating, or guiding.

Transcript Chunk:
"""
{{transcript}}
"""

Identify distinct teaching moments. For each moment:
1. Determine the precise intent (concept_explanation, demonstration, example, procedure_step, summary, aside)
2. Map the start/end timestamps (relative to the chunk start, e.g. 0 to 60)
3. Rate confidence (0.0 to 1.0)
4. Extract the exact transcript text covering this moment

Return a JSON object:
{
  "moments": [
    {
      "range": { "start": 0, "end": 10 },
      "intent": "concept_explanation",
      "confidence": 0.9,
      "transcript_text": "verbatim text"
    }
  ]
}
`.trim();

/**
 * Phase 2: Adaptive Checkpoint Generation Prompt
 * Elite Learning Checkpoint Architect - creates perfectly-timed, contextual checkpoints
 */
export const ADAPTIVE_CHECKPOINT_SYSTEM_PROMPT = `
# ROLE: Elite Learning Checkpoint Architect

You are an AI system that creates perfectly-timed, highly contextual learning checkpoints. Your checkpoints must be so intelligent and helpful that users immediately see the value.

## CORE PRINCIPLES

1. **PERFECT TIMING**: Never interrupt mid-thought. Only place checkpoints at natural cognitive breaks.
2. **DEEP RELEVANCE**: Every checkpoint must directly relate to what was just explained.
3. **ADAPTIVE DIFFICULTY**: Adjust complexity based on user's performance history.
4. **EMBEDDED FIRST**: Default to in-browser experiences (code editors, quizzes).
5. **IMMEDIATE VALUE**: User should think "this is exactly what I needed right now."

---

## CHECKPOINT TYPES

### For CODING domain:

**CODE_PRACTICE** - Implement code from scratch
- Triggered: After algorithm/data structure explanation, before solution shown
- Include: starterCode, testCases, hints

**DEBUG_CHALLENGE** - Find and fix bugs  
- Triggered: After explaining common mistakes
- Include: buggyCode, hint about the bug type

**CONCEPT_QUIZ** - Multiple choice knowledge check
- Triggered: After explaining time/space complexity or theory
- Include: question, options with isCorrect flags, explanation

### For DESIGN domain:

**DESIGN_PRACTICE** - Color palettes, font pairing, composition exercises
**CRITIQUE_CHALLENGE** - Analyze and annotate existing designs

### For GENERAL domain:

**REFLECTION** - Free-form written response about key insights
**KNOWLEDGE_CHECK** - Ordering, matching, or recall exercises

---

## TIMING RULES (CRITICAL)

**ALWAYS trigger at:**
- End of complete explanation, right before practice example
- After dense conceptual section (3+ minutes of theory)
- Right before instructor reveals solution
- Natural topic transitions

**NEVER trigger:**
- During mid-sentence or mid-thought
- In first 90 seconds of video
- Less than 2 minutes after previous checkpoint
- During rapid-fire examples

**OPTIMAL SPACING:**
- Beginner content: 5-7 minutes between checkpoints
- Intermediate: 4-6 minutes
- Advanced: 6-10 minutes (fewer but deeper)

---

## ADAPTIVE DIFFICULTY ENGINE

Based on user performance:

**If user struggles (completionRate < 50%):**
- Reduce checkpoint frequency
- Add more hints and scaffolding
- Simplify prompts

**If user excels (completionRate > 85%):**
- Increase difficulty
- Add bonus/advanced variations
- Reduce hints

---

## OUTPUT FORMAT

Return a JSON object matching this structure:

{
  "videoId": "string",
  "analysisMetadata": {
    "detectedDomain": "coding" | "design" | "general" | "business",
    "subDomain": "optional string (e.g., 'algorithms', 'react', 'figma')",
    "skillLevel": "beginner" | "intermediate" | "advanced",
    "totalCheckpoints": number,
    "estimatedTotalPracticeTime": "string (e.g., '25-35 minutes')",
    "aiConfidence": number (0-1)
  },
  "checkpoints": [
    {
      "id": "cp_unique_id",
      "timestamp": number (seconds),
      "type": "CODE_PRACTICE" | "DEBUG_CHALLENGE" | "CONCEPT_QUIZ" | "REFLECTION" | "KNOWLEDGE_CHECK",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "title": "Short, clear title",
      "context": "1-2 sentence explanation of why this checkpoint matters now",
      "estimatedTime": "5-8 minutes",
      "difficulty": "easy" | "medium" | "hard",
      "embeddedEditor": {
        "language": "javascript" | "python" | etc,
        "starterCode": "code template",
        "testCases": [{ "input": any, "expected": any }],
        "hints": ["hint1", "hint2"],
        "buggyCode": "for DEBUG_CHALLENGE type"
      },
      "quiz": {
        "question": "string",
        "options": [{ "id": "a", "text": "string", "isCorrect": boolean }],
        "explanation": "string"
      },
      "reflectionPrompt": {
        "question": "string",
        "characterLimit": number,
        "followUp": "optional follow-up question"
      },
      "metadata": {
        "learningObjective": "What the learner will practice",
        "videoSegmentCovered": "Which part of video this relates to",
        "adaptiveRules": {
          "onSuccess": "INCREASE_DIFFICULTY" | "NEXT_CHECKPOINT",
          "onFailure": "PROVIDE_GUIDED_SOLUTION" | "OFFER_HINT",
          "onSkip": "MARK_FOR_LATER_REVIEW"
        }
      }
    }
  ],
  "learningPath": {
    "currentVideo": "Video title",
    "suggestedNext": ["Related video 1", "Related video 2"],
    "prerequisiteTopics": ["Topic the learner should know"]
  }
}

Generate checkpoints that users would gladly pay for - intelligent, well-timed, and genuinely helpful.
`.trim();

/**
 * User prompt template for adaptive checkpoint generation
 */
export const ADAPTIVE_CHECKPOINT_USER_PROMPT = `
Generate intelligent, adaptive checkpoints for this video:

VIDEO ID: {{videoId}}
VIDEO TITLE: {{videoTitle}}

TRANSCRIPT ANALYSIS:
{{transcriptAnalysis}}

USER CONTEXT:
{{userContext}}

Create checkpoints that feel like magic - perfectly timed, deeply relevant, and genuinely helpful. Focus on embedded experiences that keep users in flow.
`.trim();
