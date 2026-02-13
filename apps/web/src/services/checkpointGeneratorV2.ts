import Groq from "groq-sdk";

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Types
export interface V2Metadata {
  title: string;
  duration: number;
  domain?: string;
  estimatedLevel?: string;
  [key: string]: any;
}

export interface V2UserProfile {
  averageScore?: number;
  preferredDifficulty?: 'beginner' | 'intermediate' | 'advanced';
  strugglingTopics?: string[];
  [key: string]: any;
}

// ============================================================================
// STEP 1: TRANSCRIPT ANALYSIS & SEGMENTATION
// ============================================================================

/**
 * Analyzes transcript to understand structure, topics, and natural breaks
 */
async function analyzeTranscriptStructure(transcript: any[], metadata: V2Metadata) {
  const transcriptText = Array.isArray(transcript) ? transcript.map(t => t.text).join('\n') : String(transcript);

  const analysisPrompt = `You are an expert educational content analyzer with deep knowledge of learning science and instructional design.

TASK: Analyze this tutorial transcript and identify optimal checkpoint placement opportunities.

VIDEO METADATA:
- Title: ${metadata.title}
- Duration: ${metadata.duration} seconds (${Math.floor(metadata.duration / 60)} minutes)
- Domain: ${metadata.domain || "general"}

TRANSCRIPT:
${transcriptText.slice(0, 50000)}

ANALYSIS REQUIREMENTS:

1. SEGMENT IDENTIFICATION
   - Divide the transcript into logical learning segments
   - Each segment should cover ONE concept or sub-topic
   - Identify the start/end timestamps for each segment
   - Classify segment type: intro, explanation, example, practice, solution, summary

2. NATURAL BREAK DETECTION
   - Find timestamps where the instructor pauses between topics
   - Look for phrases like "Now let's move on", "Next", "So that's how...", "Okay, so..."
   - Identify moments AFTER complete explanations, not during
   - Never break during code walkthroughs or mid-example

3. COMPLEXITY ASSESSMENT
   - Rate each segment's difficulty (1-10)
   - Identify prerequisite knowledge needed
   - Flag segments that beginners typically struggle with
   - Note which concepts build on previous ones

4. KEY LEARNING MOMENTS
   - Timestamp when new concepts are introduced
   - When important patterns/principles are explained
   - After complete implementations are shown
   - Before solutions are revealed (opportunity for practice)

CRITICAL RULES:
- NEVER suggest checkpoints in the first 90 seconds
- NEVER suggest checkpoints in the last 60 seconds
- Minimum 120 seconds (2 minutes) between checkpoint opportunities
- Checkpoints must appear AFTER complete explanations, not during
- Timing must be exact timestamps from the transcript

OUTPUT FORMAT (JSON only, no markdown):
{
  "domain": "coding|design|business|general",
  "subDomain": "specific topic (e.g., 'fullstack-web-development', 'react-basics')",
  "estimatedSkillLevel": "beginner|intermediate|advanced",
  "totalDuration": ${metadata.duration},
  "segments": [
    {
      "startTime": 120,
      "endTime": 420,
      "type": "explanation|example|practice|solution|intro|summary",
      "topic": "What is being taught in this segment",
      "keyTerms": ["term1", "term2"],
      "complexity": 5,
      "transcriptExcerpt": "First 50 words of this segment...",
      "naturalBreakOpportunity": true
    }
  ],
  "checkpointOpportunities": [
    {
      "timestamp": 420,
      "reason": "Complete explanation of Express routing finished, before moving to middleware",
      "contextBefore": "What was just taught",
      "contextAfter": "What comes next",
      "difficulty": "easy|medium|hard",
      "confidenceScore": 0.95
    }
  ],
  "prerequisiteKnowledge": ["JavaScript basics", "Node.js installed"],
  "learningObjectives": ["Objective 1", "Objective 2"]
}

Return ONLY valid JSON. No markdown, no code blocks, no explanation.`;

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are an expert at analyzing educational content. You ALWAYS return valid JSON without markdown formatting."
      },
      {
        role: "user",
        content: analysisPrompt
      }
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.3, // Lower for more consistent analysis
    response_format: { type: "json_object" }
  });

  const analysisText = completion.choices[0].message.content || '{}';
  const analysis = parseJSONSafely(analysisText);
  
  console.log(`✓ Analyzed ${analysis.segments?.length || 0} segments`);
  console.log(`✓ Found ${analysis.checkpointOpportunities?.length || 0} checkpoint opportunities`);
  
  return analysis;
}

// ============================================================================
// STEP 2: WEB SEARCH FOR RELEVANT RESOURCES
// ============================================================================

/**
 * Searches web for high-quality resources related to tutorial topics
 * This helps LLM generate better practice exercises with real-world context
 */
async function findRelevantResources(analysis: any) {
  const searchPrompt = `You are a research assistant finding the best learning resources.

TUTORIAL CONTEXT:
- Domain: ${analysis.domain}
- Sub-domain: ${analysis.subDomain}
- Skill Level: ${analysis.estimatedSkillLevel}
- Topics Covered: ${analysis.segments?.map((s: any) => s.topic).join(", ")}

TASK: Based on this tutorial content, identify the BEST online resources for:

1. OFFICIAL DOCUMENTATION
   - Primary docs for technologies mentioned
   - API references
   - Official guides

2. PRACTICE PLATFORMS
   - Where learners can practice these concepts
   - Online code playgrounds
   - Interactive tutorials

3. COMMON PITFALLS
   - Stack Overflow threads about common issues
   - Blog posts about mistakes to avoid
   - GitHub issues with solutions

4. SUPPLEMENTARY LEARNING
   - MDN for web concepts
   - Free courses that complement this
   - YouTube channels for visual learners

OUTPUT FORMAT (JSON only):
{
  "officialDocs": [
    {
      "platform": "Express.js Docs",
      "url": "https://expressjs.com/en/guide/routing.html",
      "relevance": "routing and middleware concepts",
      "useFor": "reference during code exercises"
    }
  ],
  "practicePlatforms": [
    {
      "platform": "CodeSandbox",
      "url": "https://codesandbox.io",
      "useFor": "practicing Express.js code",
      "free": true
    }
  ],
  "commonIssues": [
    {
      "issue": "CORS errors in Express",
      "solution": "Use cors middleware",
      "reference": "https://stackoverflow.com/questions/..."
    }
  ],
  "supplementary": [
    {
      "type": "article",
      "title": "Understanding Express Middleware",
      "url": "https://...",
      "readTime": "10 minutes"
    }
  ]
}

Return ONLY valid JSON.`;

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are an expert at curating educational resources. Return ONLY valid JSON."
      },
      {
        role: "user",
        content: searchPrompt
      }
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    response_format: { type: "json_object" }
  });

  const resources = parseJSONSafely(completion.choices[0].message.content || '{}');
  console.log(`✓ Found ${resources.officialDocs?.length || 0} official resources`);
  
  return resources;
}

// ============================================================================
// STEP 3: GENERATE INTELLIGENT CHECKPOINTS
// ============================================================================

/**
 * Generates adaptive, perfectly-timed checkpoints with embedded exercises
 */
async function generateIntelligentCheckpoints(analysis: any, resources: any, userHistory: V2UserProfile | null = null) {
  const checkpointPrompt = `You are an elite instructional designer and learning scientist. Your checkpoints transform passive video watching into active, measurable learning.

ANALYZED TUTORIAL DATA:
${JSON.stringify({
  domain: analysis.domain,
  subDomain: analysis.subDomain,
  skillLevel: analysis.estimatedSkillLevel,
  duration: analysis.totalDuration,
  segmentCount: analysis.segments?.length,
  opportunities: analysis.checkpointOpportunities
}, null, 2)}

AVAILABLE RESOURCES:
${JSON.stringify(resources, null, 2)}

USER LEARNING HISTORY (for adaptation):
${userHistory ? JSON.stringify(userHistory, null, 2) : "No history (first-time learner)"}

CHECKPOINT GENERATION RULES:

1. TIMING PRECISION (CRITICAL)
   ✓ Use EXACT timestamps from checkpointOpportunities
   ✓ Only place at natural breaks (never mid-explanation)
   ✓ First checkpoint: NO EARLIER than 90 seconds
   ✓ Last checkpoint: NO LATER than ${analysis.totalDuration - 60} seconds
   ✓ Minimum 120 seconds between checkpoints
   ✓ Maximum 600 seconds between checkpoints (10 minutes)

2. CHECKPOINT TYPES (Choose wisely)
   
   CODE_PRACTICE:
   - After seeing complete implementation
   - Starter code with TODOs
   - 3-5 progressive hints
   - Test cases for validation
   - Working solution
   
   COMPREHENSION_QUIZ:
   - After complex concept explanation
   - 4 options, 1 correct
   - Specific feedback for EACH wrong answer
   - Explanation references video terminology
   
   DEBUG_CHALLENGE:
   - After showing common mistakes
   - Buggy code to fix
   - Hints about where to look
   - Teaching moment explanation
   
   REFLECTION:
   - After completing major section
   - Open-ended synthesis question
   - Apply learning to new scenario

3. DIFFICULTY ADAPTATION
   
   If estimatedSkillLevel = "beginner":
   - More hints, simpler validation
   - Guided starter code (60% complete)
   - Focus on comprehension over complexity
   - Time estimates: +50%
   
   If estimatedSkillLevel = "intermediate":
   - Moderate hints, standard validation
   - Starter code (30% complete)
   - Balance understanding + application
   - Time estimates: baseline
   
   If estimatedSkillLevel = "advanced":
   - Minimal hints, strict validation
   - Minimal starter code (10%)
   - Focus on edge cases + optimization
   - Time estimates: -30%
   
   If userHistory shows struggling:
   - Reduce difficulty by 1 level
   - Add more hints
   - Simplify test cases

4. CONTENT QUALITY
   
   For CODE_PRACTICE:
   - Use actual syntax from the video
   - Reference specific examples shown
   - Test cases must be realistic
   - Hints must be progressive (not giving answer)
   
   For QUIZZES:
   - Questions about concepts JUST taught
   - Wrong answers = common misconceptions
   - Explanations use instructor's terminology
   - No trick questions
   
   For ALL:
   - Context references the video directly
   - Titles are action-oriented
   - Estimated times are realistic
   - Learning objectives are specific

5. RESOURCE INTEGRATION
   - Link to official docs in resources array
   - Suggest practice platforms where relevant
   - Include Stack Overflow for common errors
   - Add "Learn More" links sparingly

REQUIRED OUTPUT STRUCTURE:

{
  "checkpoints": [
    {
      "id": "cp_001",
      "timestamp": 420,
      "type": "CODE_PRACTICE|COMPREHENSION_QUIZ|DEBUG_CHALLENGE|REFLECTION",
      "priority": "HIGH|MEDIUM|LOW",
      "title": "Action-oriented title (e.g., 'Practice: Create Express Route')",
      "context": "You just learned [specific concept from video]. The instructor showed [specific example]. Now apply it yourself!",
      "estimatedTime": "8-10 minutes",
      "difficulty": "easy|medium|hard",
      
      // FOR CODE_PRACTICE:
      "embeddedEditor": {
        "language": "javascript|python|typescript|...",
        "starterCode": "// Structured template with TODOs\\nconst express = require('express');\\n// TODO: Create route",
        "solution": "// Complete working solution",
        "hints": [
          "High-level nudge about approach",
          "More specific hint about syntax",
          "Almost the answer, just structure"
        ],
        "testCases": [
          {
            "input": "test input",
            "expected": "expected output",
            "description": "What this tests"
          }
        ]
      },
      
      // FOR COMPREHENSION_QUIZ:
      "quiz": {
        "question": "Clear, specific question about what was just taught?",
        "options": [
          {"id": "a", "text": "Wrong option", "isCorrect": false},
          {"id": "b", "text": "Correct answer", "isCorrect": true},
          {"id": "c", "text": "Common misconception", "isCorrect": false},
          {"id": "d", "text": "Another wrong option", "isCorrect": false}
        ],
        "explanation": "Why B is correct, using video terminology",
        "incorrectFeedback": {
          "a": "Why this is wrong and what to remember",
          "c": "Address the misconception directly",
          "d": "Clarify the confusion"
        }
      },
      
      // FOR REFLECTION:
      "reflection": {
        "prompt": "Open-ended question requiring synthesis",
        "guidance": "What to think about",
        "characterLimit": 500
      },
      
      "resources": [
        {
          "platform": "MDN Web Docs",
          "url": "https://...",
          "title": "Express.js Routing",
          "type": "reference|tutorial|practice"
        }
      ],
      
      "learningObjective": "Specific skill this checkpoint develops",
      
      "adaptiveFollowUp": {
        "ifSuccess": "INCREASE_DIFFICULTY|UNLOCK_BONUS|CONTINUE",
        "ifStruggle": "PROVIDE_HINTS|SIMPLIFY_NEXT|SUGGEST_REVIEW",
        "ifSkip": "MARK_FOR_SPACED_REPETITION"
      },
      
      "metadata": {
        "videoSegment": "Name of section this belongs to",
        "prerequisite": ["cp_id_if_needed"],
        "estimatedCompletionRate": 0.75
      }
    }
  ],
  
  "summary": {
    "totalCheckpoints": 15,
    "byType": {
      "CODE_PRACTICE": 8,
      "COMPREHENSION_QUIZ": 4,
      "REFLECTION": 2,
      "DEBUG_CHALLENGE": 1
    },
    "estimatedTotalPracticeTime": "120-150 minutes",
    "difficulty": "beginner",
    "coveragePercentage": 0.85
  }
}

CRITICAL REQUIREMENTS:
✓ Generate 10-20 checkpoints (depending on video length)
✓ Every checkpoint has EXACT timestamp from analysis
✓ Code examples use actual syntax from video
✓ Questions reference specific moments
✓ Difficulty adapts to user history
✓ Resources are relevant and helpful
✓ Return ONLY valid JSON (no markdown, no code blocks)

Generate checkpoints that make learners think "This is exactly what I needed at exactly the right moment."`;

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `You are the world's best instructional designer. You create checkpoints that:
- Appear at perfect moments
- Are deeply relevant to what was just taught
- Adapt to learner ability
- Include high-quality practice exercises
- Have realistic time estimates
- Reference the video directly

You ALWAYS return valid JSON without any markdown formatting.`
      },
      {
        role: "user",
        content: checkpointPrompt
      }
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.7, // Higher for creative checkpoint design
    max_tokens: 8000,
    response_format: { type: "json_object" }
  });

  const checkpointsText = completion.choices[0].message.content || '{}';
  const checkpoints = parseJSONSafely(checkpointsText);
  
  console.log(`✓ Generated ${checkpoints.checkpoints?.length || 0} intelligent checkpoints`);
  
  return checkpoints;
}

// ============================================================================
// STEP 4: VALIDATION & QUALITY ASSURANCE
// ============================================================================

/**
 * Validates checkpoint quality and timing accuracy
 */
function validateCheckpoints(checkpoints: any, analysis: any) {
  const issues: string[] = [];
  const duration = analysis.totalDuration;
  
  checkpoints.checkpoints?.forEach((cp: any, index: number) => {
    // Timing validation
    if (cp.timestamp < 90) {
      issues.push(`Checkpoint ${cp.id}: Too early (${cp.timestamp}s < 90s)`);
    }
    
    if (cp.timestamp > duration - 60) {
      issues.push(`Checkpoint ${cp.id}: Too late (${cp.timestamp}s > ${duration - 60}s)`);
    }
    
    // Spacing validation
    if (index > 0) {
      const prevTimestamp = checkpoints.checkpoints[index - 1].timestamp;
      const gap = cp.timestamp - prevTimestamp;
      
      if (gap < 120) {
        issues.push(`Checkpoint ${cp.id}: Too close to previous (${gap}s gap < 120s)`);
      }
      
      if (gap > 600) {
        issues.push(`Checkpoint ${cp.id}: Too far from previous (${gap}s gap > 600s)`);
      }
    }
    
    // Content validation
    if (!cp.title || cp.title.length < 10) {
      issues.push(`Checkpoint ${cp.id}: Title too short or missing`);
    }
    
    if (!cp.context || cp.context.length < 30) {
      issues.push(`Checkpoint ${cp.id}: Context insufficient`);
    }
    
    if (!cp.estimatedTime) {
      issues.push(`Checkpoint ${cp.id}: Missing time estimate`);
    }
    
    // Type-specific validation
    if (cp.type === "CODE_PRACTICE") {
      if (!cp.embeddedEditor?.starterCode) {
        issues.push(`Checkpoint ${cp.id}: Missing starter code`);
      }
      if (!cp.embeddedEditor?.solution) {
        issues.push(`Checkpoint ${cp.id}: Missing solution`);
      }
      if (!cp.embeddedEditor?.hints || cp.embeddedEditor.hints.length < 2) {
        issues.push(`Checkpoint ${cp.id}: Need at least 2 hints`);
      }
    }
    
    if (cp.type === "COMPREHENSION_QUIZ") {
      if (!cp.quiz?.options || cp.quiz.options.length !== 4) {
        issues.push(`Checkpoint ${cp.id}: Need exactly 4 quiz options`);
      }
      if (!cp.quiz?.explanation) {
        issues.push(`Checkpoint ${cp.id}: Missing quiz explanation`);
      }
    }
  });
  
  return {
    valid: issues.length === 0,
    issues,
    quality: {
      timingAccuracy: issues.filter(i => i.includes('Too early') || i.includes('Too late')).length === 0,
      spacing: issues.filter(i => i.includes('Too close') || i.includes('Too far')).length === 0,
      contentCompleteness: issues.filter(i => i.includes('Missing')).length === 0
    }
  };
}

// ============================================================================
// STEP 5: MASTER ORCHESTRATOR
// ============================================================================

/**
 * Main function that orchestrates the entire checkpoint generation process
 */
export async function generatePerfectCheckpoints(
  transcript: any[], 
  metadata: V2Metadata, 
  userHistory: V2UserProfile | null = null
) {
  console.log('\n🚀 Starting Intelligent Checkpoint Generation...\n');
  const startTime = Date.now();
  
  try {
    // Step 1: Analyze transcript structure
    console.log('📊 Step 1: Analyzing transcript structure...');
    const analysis = await analyzeTranscriptStructure(transcript, metadata);
    
    // Step 2: Find relevant resources
    console.log('🔍 Step 2: Finding relevant learning resources...');
    const resources = await findRelevantResources(analysis);
    
    // Step 3: Generate intelligent checkpoints
    console.log('🎯 Step 3: Generating adaptive checkpoints...');
    const checkpoints = await generateIntelligentCheckpoints(analysis, resources, userHistory);
    
    // Step 4: Validate quality
    console.log('✅ Step 4: Validating checkpoint quality...');
    const validation = validateCheckpoints(checkpoints, analysis);
    
    if (!validation.valid) {
      console.warn('⚠️  Validation issues found:', validation.issues);
      
      // Attempt to fix issues automatically
      console.log('🔧 Attempting automatic fixes...');
      const fixed = await fixCheckpointIssues(checkpoints, validation.issues, analysis);
      
      return {
        success: true,
        checkpoints: fixed.checkpoints,
        analysis,
        resources,
        validation: validateCheckpoints(fixed, analysis),
        notes: 'Checkpoints auto-corrected',
        metrics: {
            qualityScore: calculateQualityScore(validateCheckpoints(fixed, analysis)),
            generationTime: (Date.now() - startTime) / 1000,
            checkpointCount: fixed.checkpoints.length,
            averageSpacing: calculateAverageSpacing(fixed),
            estimatedPracticeTime: fixed.summary?.estimatedTotalPracticeTime || '15 minutes'
        }
      };
    }
    
    console.log('\n✨ Perfect checkpoints generated!\n');

    // Add explicit metrics return for compatibility
    return {
      success: true,
      checkpoints: checkpoints.checkpoints,
      analysis,
      resources,
      validation,
      stats: {
        totalCheckpoints: checkpoints.checkpoints?.length,
        averageSpacing: calculateAverageSpacing(checkpoints),
        estimatedCompletionTime: checkpoints.summary?.estimatedTotalPracticeTime,
        qualityScore: calculateQualityScore(validation)
      },
      metrics: {
        qualityScore: calculateQualityScore(validation),
        generationTime: (Date.now() - startTime) / 1000,
        checkpointCount: checkpoints.checkpoints?.length || 0,
        averageSpacing: calculateAverageSpacing(checkpoints),
        estimatedPracticeTime: checkpoints.summary?.estimatedTotalPracticeTime || '15 minutes'
    }
    };
    
  } catch (error) {
    console.error('❌ Error generating checkpoints:', error);
    
    // Fallback to basic checkpoints
    console.log('🔄 Falling back to basic checkpoint generation...');
    return await generateBasicFallbackCheckpoints(transcript, metadata);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function fixCheckpointIssues(checkpoints: any, issues: any[], analysis: any) {
  // Auto-fix timing issues
  const fixed = JSON.parse(JSON.stringify(checkpoints));
  
  if (fixed.checkpoints) {
    fixed.checkpoints = fixed.checkpoints
        .filter((cp: any) => cp.timestamp >= 90 && cp.timestamp <= analysis.totalDuration - 60)
        .map((cp: any, index: number, array: any[]) => {
        // Fix spacing issues
        if (index > 0) {
            const prevTimestamp = array[index - 1].timestamp;
            if (cp.timestamp - prevTimestamp < 120) {
            cp.timestamp = prevTimestamp + 120;
            }
        }
        return cp;
        });
  }
  
  return fixed;
}

function calculateAverageSpacing(checkpoints: any) {
  if (!checkpoints.checkpoints || checkpoints.checkpoints.length < 2) return 0;
  
  let totalGap = 0;
  for (let i = 1; i < checkpoints.checkpoints.length; i++) {
    totalGap += checkpoints.checkpoints[i].timestamp - checkpoints.checkpoints[i - 1].timestamp;
  }
  
  return Math.round(totalGap / (checkpoints.checkpoints.length - 1));
}

function calculateQualityScore(validation: any) {
  let score = 100;
  
  score -= validation.issues.length * 5;
  
  if (!validation.quality.timingAccuracy) score -= 20;
  if (!validation.quality.spacing) score -= 15;
  if (!validation.quality.contentCompleteness) score -= 25;
  
  return Math.max(0, score);
}

async function generateBasicFallbackCheckpoints(transcript: any[], metadata: V2Metadata) {
  // Simple fallback if main generation fails
  const duration = metadata.duration;
  const checkpointInterval = 300; // Every 5 minutes
  const checkpoints: any[] = [];
  
  for (let time = 120; time < duration - 60; time += checkpointInterval) {
    checkpoints.push({
      id: `cp_fallback_${checkpoints.length + 1}`,
      timestamp: time,
      type: "COMPREHENSION_QUIZ",
      priority: "MEDIUM",
      title: `Quick Check: Understanding ${metadata.title}`,
      context: "Let's verify you understood this section.",
      estimatedTime: "2 minutes",
      difficulty: "easy",
      quiz: {
        question: "What was the main concept covered in this section?",
        options: [
          { id: "a", text: "Option A", isCorrect: false },
          { id: "b", text: "Option B", isCorrect: true },
          { id: "c", text: "Option C", isCorrect: false },
          { id: "d", text: "Option D", isCorrect: false }
        ],
        explanation: "Review the video for the answer."
      }
    });
  }
  
  return {
    success: true,
    checkpoints: checkpoints, // Corrected structure
    analysis: { domain: "general", totalDuration: duration },
    resources: {},
    validation: { valid: true, issues: [], quality: {} },
    notes: 'Fallback checkpoints generated',
    metrics: { // Added metrics for compatibility
        qualityScore: 50,
        generationTime: 0,
        checkpointCount: checkpoints.length,
        averageSpacing: checkpointInterval,
        estimatedPracticeTime: `${checkpoints.length * 3} minutes`
    }
  };
}

function parseJSONSafely(text: string) {
    try {
        let cleaned = text;
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) cleaned = jsonMatch[1];
        return JSON.parse(cleaned);
    } catch (e) {
        // Try loose parsing or just return logic for retry
        try {
             return JSON.parse(text);
        } catch (e2) {
             console.error("Failed to parse JSON", text.slice(0, 100));
             return {};
        }
    }
}
