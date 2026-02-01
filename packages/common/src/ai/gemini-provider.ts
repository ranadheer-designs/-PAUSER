/**
 * Gemini AI Provider
 * 
 * Direct integration with Google's Gemini API for high-quality
 * checkpoint and coding challenge generation.
 */

import { z } from 'zod';
import type { AIConfig } from './types';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Gemini-specific configuration
 */
export interface GeminiConfig {
  apiKey: string;
  model?: string;
}

/**
 * Gemini Provider for direct API calls to Google's Gemini models.
 * Optimized for code generation and educational content.
 */
export class GeminiProvider {
  private apiKey: string;
  private model: string;

  constructor(config: GeminiConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gemini-1.5-flash';
  }

  /**
   * Generate content using Gemini API with structured JSON output
   */
  async generate<T>(
    prompt: string,
    schema: z.ZodType<T>,
    systemPrompt: string = ''
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is required');
    }

    const url = `${GEMINI_API_BASE}/models/${this.model}:generateContent?key=${this.apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[Gemini] API Error:', response.status, errorBody);
        throw new Error(`Gemini API failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Extract text from Gemini response
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        throw new Error('Empty response from Gemini');
      }

      // Clean and parse JSON (remove markdown code blocks if present)
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/\n?```/g, '')
        .trim();
      
      const json = JSON.parse(cleanContent);

      // Validate with Zod schema
      return schema.parse(json);

    } catch (error) {
      console.error('[Gemini] Generation Error:', error);
      throw error;
    }
  }

  /**
   * Generate with retry logic and exponential backoff
   */
  async generateWithRetry<T>(
    prompt: string,
    schema: z.ZodType<T>,
    systemPrompt: string = '',
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.generate(prompt, schema, systemPrompt);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if rate limited
        if (lastError.message.includes('429') || lastError.message.includes('RESOURCE_EXHAUSTED')) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`[Gemini] Rate limited, waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // For other errors, throw immediately
        throw lastError;
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }
}

/**
 * Check if a Gemini API key is configured and valid format
 */
export function isGeminiConfigured(apiKey?: string): boolean {
  return !!apiKey && apiKey.startsWith('AIza');
}
