import { TranscriptSegment } from './robustTranscriptExtractor';

export interface CheckpointSuggestion {
  timestamp: number;
  type: 'quiz' | 'practice' | 'reflection' | 'code_practice';
  reason: string;
  suggestedPrompt: string;
  codePractice?: {
    language: string;
    starterCode: string;
    solution: string;
    testCases: { input: any; expected: any }[];
    hints: string[];
  };
}

export interface VideoAnalysis {
  domain: string;
  subDomain: string;
  detectedSkillLevel: 'beginner' | 'intermediate' | 'advanced';
  segments: {
    startTime: number;
    endTime: number;
    type: 'explanation' | 'example' | 'solution';
    topic: string;
    complexity: number;
  }[];
  naturalBreakPoints: number[];
  checkpointSuggestions: CheckpointSuggestion[];
}

/**
 * Analyzes transcript using Gemini or OpenRouter to identify structure and learning checkpoints.
 */
export async function analyzeTranscript(
  transcript: TranscriptSegment[], 
  duration: number
): Promise<VideoAnalysis> {
  console.log(`[TranscriptAnalyzer] Analyzing ${transcript.length} segments (${duration}s)`);

  const fullText = transcript
    .map(t => `[${Math.floor(t.start)}s] ${t.text}`)
    .join('\n');
    
  const MAX_CHARS = 100000;
  let textToSend = fullText;
  if (fullText.length > MAX_CHARS) {
    console.warn(`[TranscriptAnalyzer] Transcript too long (${fullText.length} chars), truncating to ${MAX_CHARS}`);
    textToSend = fullText.substring(0, MAX_CHARS) + "\n...[TRUNCATED]...";
  }

  const prompt = `
Analyze this educational video transcript and return a JSON object with:
{
  "domain": "coding|design|business|general",
  "subDomain": "specific topic",
  "detectedSkillLevel": "beginner|intermediate|advanced",
  "segments": [
    {
      "startTime": 180,
      "endTime": 300,
      "type": "explanation|example|solution",
      "topic": "topic name",
      "complexity": 5
    }
  ],
  "naturalBreakPoints": [120, 300, 480],
  "checkpointSuggestions": [
    {
      "timestamp": 180,
      "type": "quiz|practice|reflection|code_practice",
      "reason": "why this is a good checkpoint",
      "suggestedPrompt": "what to ask learner",
      "codePractice": {
         "language": "javascript|python",
         "starterCode": "function incomplete() { ... }",
         "solution": "function complete() { ... }",
         "testCases": [
            {"input": [1, 2], "expected": 3}
         ],
         "hints": ["hint 1", "hint 2"]
      }
    }
  ]
}

Rules:
- Timestamps in seconds
- Natural breaks only
- Avoid first 90s/last 60s
- Checkpoints 3+ mins apart
- If topic is PROGRAMMING/CODING, prefer "code_practice"
- "code_practice" MUST include "starterCode", "solution", "testCases"
- Return ONLY valid JSON

Transcript:
${textToSend}
`;

  try {
    // 1. Try Gemini (Google Generative AI)
    const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (googleApiKey) {
        console.log(`[TranscriptAnalyzer] Using Google Gemini API (Key length: ${googleApiKey.length})`);
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(googleApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        console.log('[TranscriptAnalyzer] Sending prompt to Gemini...');
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        console.log('[TranscriptAnalyzer] Gemini Raw Response:', text.substring(0, 500) + '...'); // Log first 500 chars
        return parseLLMResponse(text);
    }

    // 2. Fallback to OpenRouter
    const openRouterKey = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY; 
    if (openRouterKey) {
       console.log(`[TranscriptAnalyzer] Using OpenRouter API (Key length: ${openRouterKey.length})`);
       const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openRouterKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              "model": "google/gemini-2.0-flash-001",
              "messages": [
                { "role": "user", "content": prompt }
              ]
            })
          });
          
        if (!response.ok) {
             const errText = await response.text();
             throw new Error(`OpenRouter Error: ${response.status} - ${errText}`);
        }
        const data = await response.json();
        const content = data.choices[0].message.content;
        console.log('[TranscriptAnalyzer] OpenRouter Raw Response:', content.substring(0, 500) + '...');
        return parseLLMResponse(content);
    }
    
    throw new Error('No valid API Kind (Google or OpenRouter) found in environment variables.');

  } catch (error) {
    console.error('[TranscriptAnalyzer] ❌ Analysis failed with error:', error);
    if (error instanceof Error && error.message.includes('GoogleGenerativeAI Error')) {
        console.error('[TranscriptAnalyzer] Full error details:', JSON.stringify(error, null, 2));
    }
    return {
      domain: 'general',
      subDomain: 'misc',
      detectedSkillLevel: 'beginner',
      segments: [],
      naturalBreakPoints: [],
      checkpointSuggestions: []
    };
  }
}

function parseLLMResponse(content: string): VideoAnalysis {
  try {
    // Remove markdown code blocks if present
    const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanContent);
    
    // Basic validation
    if (!parsed.segments || !Array.isArray(parsed.segments)) {
       console.warn('[TranscriptAnalyzer] Invalid structure: missing segments');
       parsed.segments = [];
    }
    
    return parsed as VideoAnalysis;
  } catch (e) {
    console.error('[TranscriptAnalyzer] Failed to parse JSON response:', content);
    throw new Error('Invalid JSON response from LLM');
  }
}
