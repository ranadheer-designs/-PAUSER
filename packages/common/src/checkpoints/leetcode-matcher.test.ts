/**
 * LeetCode Matcher Unit Tests
 * 
 * Tests the problem detection and matching functionality.
 */

import { describe, it, expect } from 'vitest';
import {
  detectExactProblemMentions,
  detectConceptBasedMatches,
  findPracticeOpportunities,
  createPracticeCheckpoint,
  LEETCODE_PROBLEMS,
  CONCEPT_TO_PROBLEMS,
} from './leetcode-matcher';

describe('LeetCode Matcher', () => {
  describe('detectExactProblemMentions', () => {
    it('should detect exact problem name mentions', () => {
      const text = 'Today we will solve the Two Sum problem on LeetCode';
      const matches = detectExactProblemMentions(text);
      
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].resource.title).toBe('Two Sum');
      expect(matches[0].confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should detect LeetCode problem numbers', () => {
      const text = 'Let\'s solve LeetCode 217 which is about duplicates';
      const matches = detectExactProblemMentions(text);
      
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].resource.problemId).toBe('217');
      expect(matches[0].matchReason).toContain('LeetCode #217');
    });

    it('should detect LC abbreviation with numbers', () => {
      const text = 'This is LC 15 also known as 3Sum';
      const matches = detectExactProblemMentions(text);
      
      // Should find both the LC 15 reference and 3Sum name
      expect(matches.length).toBeGreaterThanOrEqual(1);
      const problemIds = matches.map(m => m.resource.problemId);
      expect(problemIds).toContain('15');
    });

    it('should handle case insensitivity', () => {
      const text = 'the VALID PARENTHESES problem is great for learning stacks';
      const matches = detectExactProblemMentions(text);
      
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].resource.title).toBe('Valid Parentheses');
    });

    it('should return empty for non-matching text', () => {
      const text = 'Today we will learn about React hooks and state management';
      const matches = detectExactProblemMentions(text);
      
      expect(matches.length).toBe(0);
    });

    it('should avoid duplicate matches', () => {
      const text = 'LeetCode 1 is Two Sum, also called the two sum problem';
      const matches = detectExactProblemMentions(text);
      
      const problemIds = matches.map(m => m.resource.problemId);
      const uniqueIds = [...new Set(problemIds)];
      expect(problemIds.length).toBe(uniqueIds.length);
    });
  });

  describe('detectConceptBasedMatches', () => {
    it('should detect hash map concept and suggest problems', () => {
      const text = 'We use a hash map to store the complement values';
      const matches = detectConceptBasedMatches(text);
      
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].matchReason).toContain('Concept');
    });

    it('should detect two pointers technique', () => {
      const text = 'The two pointers technique is efficient for sorted arrays';
      const matches = detectConceptBasedMatches(text);
      
      expect(matches.length).toBeGreaterThan(0);
      const titles = matches.map(m => m.resource.title);
      // Two pointers should suggest problems like "Valid Palindrome", "3Sum"
      expect(titles.some(t => ['Valid Palindrome', '3Sum', 'Container With Most Water'].includes(t))).toBe(true);
    });

    it('should detect dynamic programming concepts', () => {
      const text = 'Dynamic programming works by building up solutions to subproblems';
      const matches = detectConceptBasedMatches(text);
      
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some(m => m.resource.concepts.includes('dynamic programming'))).toBe(true);
    });

    it('should limit results to top 5', () => {
      const text = 'hash map array linked list binary tree graph dfs bfs recursion';
      const matches = detectConceptBasedMatches(text);
      
      expect(matches.length).toBeLessThanOrEqual(5);
    });

    it('should return empty for non-coding content', () => {
      const text = 'Today we discuss marketing strategies for small businesses';
      const matches = detectConceptBasedMatches(text);
      
      expect(matches.length).toBe(0);
    });
  });

  describe('findPracticeOpportunities', () => {
    it('should prefer exact matches over concept matches', () => {
      const text = 'We will solve Two Sum using a hash map approach';
      const matches = findPracticeOpportunities(text);
      
      expect(matches.length).toBeGreaterThan(0);
      // First match should be the exact "Two Sum" match with higher confidence
      expect(matches[0].resource.title).toBe('Two Sum');
      expect(matches[0].confidence).toBeGreaterThan(0.8);
    });

    it('should respect maxResults option', () => {
      const text = 'hash map, two pointers, binary search, dynamic programming, graphs';
      const matches = findPracticeOpportunities(text, { maxResults: 2 });
      
      expect(matches.length).toBeLessThanOrEqual(2);
    });

    it('should filter by minConfidence', () => {
      const text = 'We briefly mention arrays and loops';
      const matches = findPracticeOpportunities(text, { minConfidence: 0.85 });
      
      // Concept matches typically have 0.7 confidence, so should be filtered
      matches.forEach(m => {
        expect(m.confidence).toBeGreaterThanOrEqual(0.85);
      });
    });

    it('should combine exact and concept matches without duplicates', () => {
      const text = 'Two Sum is a classic hash map problem';
      const matches = findPracticeOpportunities(text);
      
      const problemIds = matches.map(m => m.resource.problemId);
      const uniqueIds = [...new Set(problemIds)];
      expect(problemIds.length).toBe(uniqueIds.length);
    });
  });

  describe('createPracticeCheckpoint', () => {
    it('should create a valid practice checkpoint', () => {
      const match = {
        resource: LEETCODE_PROBLEMS['two sum'],
        confidence: 0.9,
        matchReason: 'Problem mentioned: "Two Sum"',
      };
      
      const checkpoint = createPracticeCheckpoint(match, 180);
      
      expect(checkpoint.type).toBe('practice_resource');
      expect(checkpoint.timestamp).toBe(180);
      expect(checkpoint.title).toBe('Practice: Two Sum');
      expect(checkpoint.content.url).toBe('https://leetcode.com/problems/two-sum/');
      expect(checkpoint.content.matchConfidence).toBe(0.9);
    });
  });

  describe('Problem Database', () => {
    it('should have all required fields for each problem', () => {
      Object.entries(LEETCODE_PROBLEMS).forEach(([key, problem]) => {
        expect(problem.platform).toBeDefined();
        expect(problem.problemId).toBeDefined();
        expect(problem.title).toBeDefined();
        expect(problem.difficulty).toMatch(/easy|medium|hard/);
        expect(problem.url).toContain('leetcode.com');
        expect(problem.concepts.length).toBeGreaterThan(0);
      });
    });

    it('should have concept mappings pointing to valid problems', () => {
      Object.entries(CONCEPT_TO_PROBLEMS).forEach(([concept, problemKeys]) => {
        problemKeys.forEach(key => {
          expect(LEETCODE_PROBLEMS[key]).toBeDefined();
        });
      });
    });
  });
});
