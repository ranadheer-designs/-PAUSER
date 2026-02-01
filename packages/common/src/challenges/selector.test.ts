import { describe, it, expect } from 'vitest';
import { selectTemplates } from './selector';

describe('Challenge Selector', () => {
  it('should select templates matching concepts', () => {
    const templates = selectTemplates(['Array']);
    expect(templates.length).toBeGreaterThan(0);
    expect(templates[0].concepts).toContain('Array');
  });

  it('should match concepts case-insensitively', () => {
    const templates = selectTemplates(['array', 'FUNCTION']);
    expect(templates.length).toBeGreaterThan(0);
  });

  it('should return empty list if no matches', () => {
    const templates = selectTemplates(['NonExistentConcept']);
    expect(templates).toEqual([]);
  });

  it('should prioritize better matches', () => {
    // filter-even matches Array, Function, Conditionals (3 matches)
    // double-array matches Array, Function, Iteration (3 matches)
    
    const templates = selectTemplates(['Array', 'Function', 'Conditionals']);
    const first = templates[0];
    
    // Should be filter-even because it matches 3 concepts
    expect(first.id).toBe('filter-even');
  });
});
