/**
 * Groq AI Provider
 * 
 * Direct integration with Groq's API for high-quality, fast
 * checkpoint and coding challenge generation.
 * Replaces GeminiProvider as the primary AI provider.
 */

import { z } from 'zod';

const GROQ_API_BASE = 'https://api.groq.com/openai/v1';

/**
 * Groq-specific configuration
 */
export interface GroqConfig {
  apiKey: string;
  model?: string;
}

/**
 * Groq Provider for direct API calls to Groq's LLM models.
 * Optimized for fast inference with code generation and educational content.
 */
export class GroqProvider {
  private apiKey: string;
  private model: string;

  constructor(config: GroqConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'llama-3.3-70b-versatile';
  }

  /**
   * Generate content using Groq API with structured JSON output
   */
  async generate<T>(
    prompt: string,
    schema: z.ZodType<T>,
    systemPrompt: string = ''
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Groq API key is required');
    }

    const url = `${GROQ_API_BASE}/chat/completions`;

    try {
      const messages: Array<{ role: string; content: string }> = [];

      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }

      messages.push({
        role: 'user',
        content: prompt + '\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, no explanation.'
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 4096,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[Groq] API Error:', response.status, errorBody);
        throw new Error(`Groq API failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Extract text from Groq response (OpenAI-compatible format)
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from Groq');
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
      console.error('[Groq] Generation Error:', error);
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
        if (lastError.message.includes('429') || lastError.message.includes('rate_limit')) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`[Groq] Rate limited, waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // For other errors on non-final attempts, retry with delay
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 500;
          console.log(`[Groq] Error on attempt ${attempt + 1}, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Final attempt — throw
        throw lastError;
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }
}

/**
 * Check if a Groq API key is configured and valid format
 */
export function isGroqConfigured(apiKey?: string): boolean {
  return !!apiKey && apiKey.startsWith('gsk_');
}
