import { describe, it, expect } from 'vitest';
import { extractConceptsRuleBased } from './concept-extractor';

describe('Concept Extractor', () => {
  it('should extract concepts from text', () => {
    const text = "In this video we will use React hooks like useState and useEffect.";
    const concepts = extractConceptsRuleBased(text);
    
    expect(concepts).toContain('React');
    expect(concepts).toContain('Hook');
    // Should return the dictionary Key, not the matched word
    expect(concepts).toContain('Hook'); 
    expect(concepts).not.toContain('UseState'); // Mapped to Hook
  });

  it('should be case insensitive', () => {
    const text = "react REACT reAct";
    const concepts = extractConceptsRuleBased(text);
    expect(concepts).toEqual(['React']);
  });

  it('should deduplicate results', () => {
    const text = "function function function";
    const concepts = extractConceptsRuleBased(text);
    expect(concepts).toEqual(['Function']);
  });

  it('should avoid partial matches', () => {
    // "State" should not match "statement"
    const text = "This is a statement.";
    const concepts = extractConceptsRuleBased(text);
    expect(concepts).not.toContain('State');
  });

  it('should match multiple keywords for same concept', () => {
    const text = "We use async and promises.";
    const concepts = extractConceptsRuleBased(text);
    expect(concepts).toEqual(['Asynchronous']);
  });
});

describe('AI Concept Extractor', () => {
  it('should return empty array if disabled', async () => {
    const { extractConceptsAI } = await import('./concept-extractor');
    const concepts = await extractConceptsAI("some text", { enabled: false });
    expect(concepts).toEqual([]);
  });

  it('should return empty array if missing key', async () => {
    const { extractConceptsAI } = await import('./concept-extractor');
    const concepts = await extractConceptsAI("some text", { enabled: true });
    expect(concepts).toEqual([]);
  });
});
