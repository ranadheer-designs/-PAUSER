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
 * Analyzes transcript using Groq or OpenRouter to identify structure and learning checkpoints.
 */
export async function analyzeTranscript(
  transcript: TranscriptSegment[], 
  duration: number
): Promise<VideoAnalysis> {
  console.log(`[TranscriptAnalyzer] Analyzing ${transcript.length} segments (${duration}s)`);

  const fullText = transcript
    .map(t => `[${Math.floor(t.start)}s] ${t.text}`)
    .join('\n');
    
  const MAX_CHARS = 500000;
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
    // 1. Try Groq (Primary AI Provider)
    const groqApiKey = process.env.GROQ_API_KEY;
    
    if (!groqApiKey) {
        console.warn('[TranscriptAnalyzer] GROQ_API_KEY is missing!');
    }

    // Groq Free Tier has ~12k TPM limit. Skip if text is too long (approx > 15k chars ≈ 4k tokens + overhead)
    const isTooLargeForGroq = textToSend.length > 20000;
    
    if (groqApiKey && !isTooLargeForGroq) {
        console.log(`[TranscriptAnalyzer] Using Groq API (Key length: ${groqApiKey.length})`);
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${groqApiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [
                { role: "user", content: prompt }
              ],
              temperature: 0.7,
              max_tokens: 4096,
              response_format: { type: "json_object" }
            })
          });
          
        if (!groqResponse.ok) {
             const errText = await groqResponse.text();
             console.warn(`[TranscriptAnalyzer] Groq Error: ${groqResponse.status} - ${errText}, falling back to OpenRouter`);
        } else {
            const groqData = await groqResponse.json();
            const groqContent = groqData.choices[0].message.content;
            console.log('[TranscriptAnalyzer] Groq Raw Response:', groqContent.substring(0, 500) + '...');
            return parseLLMResponse(groqContent);
        }
    } else if (isTooLargeForGroq) {
        console.log(`[TranscriptAnalyzer] Skipping Groq (Transcript length ${textToSend.length} > 20000 chars), using OpenRouter for large context...`);
    }

    // 2. Fallback to OpenRouter with Retry System
    const openRouterKey = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY; 
    
    if (openRouterKey) {
       // Prioritized list of free models for large context analysis
       const FALLBACK_MODELS = [
         "tngtech/deepseek-r1t2-chimera:free",  // Strongest reasoning
         "deepseek/deepseek-r1:free",           // Top tier
         "arcee-ai/trinity-large-preview:free", // Good fallback
         "meta-llama/llama-3.3-70b-instruct:free", // Reliable
         "google/gemini-2.0-pro-exp-02-05:free",   // Fast & Smart
         "qwen/qwen3-next-80b-a3b-instruct:free",
         "stepfun/step-3.5-flash:free",
         "openrouter/free"                      // Last resort
       ];

       for (const model of FALLBACK_MODELS) {
         // Retry loop for each model (handle 429/5xx)
         const MAX_RETRIES = 2;
         let attempt = 0;
         
         while (attempt <= MAX_RETRIES) {
           try {
             if (attempt === 0) console.log(`[TranscriptAnalyzer] Using OpenRouter with ${model}...`);
             else console.log(`[TranscriptAnalyzer] Retrying ${model} (Attempt ${attempt + 1}/${MAX_RETRIES + 1})...`);

             const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${openRouterKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || "https://pauser.online"), // Required by OpenRouter
                    "X-Title": "DeepFocus"
                  },
                  body: JSON.stringify({
                    "model": model,
                    "messages": [
                      { "role": "user", "content": prompt }
                    ]
                  })
                });
                
              if (!response.ok) {
                   const errText = await response.text();
                   // Check for retryable errors
                   const isRetryable = response.status === 429 || response.status >= 500;
                   
                   if (isRetryable && attempt < MAX_RETRIES) {
                     const delay = Math.pow(2, attempt) * 1000;
                     console.warn(`[TranscriptAnalyzer] ${model} hit limits (${response.status}). Retrying in ${delay}ms...`);
                     await new Promise(resolve => setTimeout(resolve, delay));
                     attempt++;
                     continue;
                   }
                   
                   throw new Error(`OpenRouter Error: ${response.status} - ${errText}`);
              }
              
              const data = await response.json();
              if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                 throw new Error('Invalid OpenRouter response format');
              }
              
              const content = data.choices[0].message.content;
              console.log('[TranscriptAnalyzer] OpenRouter Success:', content.substring(0, 100) + '...');
              return parseLLMResponse(content);
              
           } catch (error: any) {
             console.warn(`[TranscriptAnalyzer] Model ${model} failed:`, error.message);
             // Break inner loop to try next model
             break;
           }
         }
         // Short pause before switching models
         await new Promise(resolve => setTimeout(resolve, 500));
       }
    }
    
    throw new Error('All AI providers and fallback models failed to analyze transcript.');

  } catch (error) {
    console.error('[TranscriptAnalyzer] ❌ Analysis failed with error:', error);
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
