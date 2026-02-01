/**
 * AI Provider
 * 
 * Handles the raw communication with OpenRouter/Gemini APIs.
 */

import { z } from 'zod';
import type { AIConfig } from './types';

export class AIProvider {
  constructor(private config: AIConfig) {}

  /**
   * Send a completion request and validated the JSON response.
   */
  async generate<T>(
    prompt: string, 
    schema: z.ZodType<T>,
    systemPrompt: string = ''
  ): Promise<T> {
    if (!this.config.enabled || !this.config.apiKey) {
      throw new Error('AI Provider is disabled or missing API key');
    }

    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[AIProvider] Retry attempt ${attempt}...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }

        const response = await fetch(this.config.baseUrl || 'https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
            'HTTP-Referer': 'https://github.com/pauser/pauser', // OpenRouter requirement
            'X-Title': 'Pauser'
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: [
              { role: 'system', content: systemPrompt + '\n\nIMPORTANT: Respond with valid JSON only, no markdown or explanation.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.3, // Lower temperature for more consistent output
            max_tokens: 2048
            // NOTE: response_format removed for compatibility with free models
          })
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`AI API failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error('Empty response from AI');
        }

        // Parse JSON from content (handle markdown code blocks)
        let cleanContent = content;
        
        // Remove markdown json blocks
        cleanContent = cleanContent.replace(/```json\n?/gi, '').replace(/\n?```/g, '');
        
        // Try to extract JSON object if there's text before/after
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanContent = jsonMatch[0];
        }
        
        cleanContent = cleanContent.trim();
        
        const json = JSON.parse(cleanContent);

        // Validate with Zod
        return schema.parse(json);

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[AIProvider] Attempt ${attempt + 1} failed:`, lastError.message);
        
        // Don't retry on validation errors (Zod will fail same way)
        if (lastError.message.includes('Zod') || lastError.message.includes('parse')) {
          throw lastError;
        }
      }
    }

    throw lastError || new Error('AI generation failed after retries');
  }
}

