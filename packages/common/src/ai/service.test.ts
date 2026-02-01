/**
 * AI Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService } from './service';
import { AIProvider } from './provider';

// Mock Provider
vi.mock('./provider');

describe('AIService', () => {
  let service: AIService;
  
  const mockConfig = {
    enabled: true,
    model: 'test-model',
    apiKey: 'test-key'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AIService(mockConfig);
  });

  describe('explainError', () => {
    it('should return fallback when disabled', async () => {
      const disabledService = new AIService({ ...mockConfig, enabled: false });
      const result = await disabledService.explainError({ errorMessage: 'Test error' });
      
      expect(result.title).toBe('Error Analysis Unavailable');
    });

    it('should call provider when enabled', async () => {
      // Mock provider response
      const mockExplanation = {
        title: 'Test Explanation',
        explanation: 'This is a test.',
        relatedConcepts: ['Testing']
      };
      
      const generateMock = vi.fn().mockResolvedValue(mockExplanation);
      
      // Mock the AIProvider class implementation
      // @ts-ignore
      AIProvider.mockImplementation(() => ({
        generate: generateMock
      }));

      const result = await service.explainError({ errorMessage: 'SyntaxError' });

      expect(generateMock).toHaveBeenCalled();
      expect(result).toEqual(mockExplanation);
    });

    it('should return fallback on provider failure', async () => {
      // Mock failure
      const generateMock = vi.fn().mockRejectedValue(new Error('API Down'));
      
      // @ts-ignore
      AIProvider.mockImplementation(() => ({
        generate: generateMock
      }));

      const result = await service.explainError({ errorMessage: 'SyntaxError' });
      
      expect(result.title).toBe('Error Analysis Unavailable');
    });
  });
});
