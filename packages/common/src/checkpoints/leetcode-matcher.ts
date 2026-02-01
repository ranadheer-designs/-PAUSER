/**
 * LeetCode Problem Matcher
 *
 * Detects practice opportunities from video transcripts by:
 * 1. Exact problem name matching (e.g., "Two Sum", "Valid Parentheses")
 * 2. Concept-based matching (e.g., "hash map" → related problems)
 *
 * Returns ranked practice resources with confidence scores.
 */

// ============================================================================
// Types
// ============================================================================

export type Platform = 'leetcode' | 'hackerrank' | 'codewars';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface PracticeResource {
  platform: Platform;
  problemId: string;
  title: string;
  difficulty: Difficulty;
  url: string;
  concepts: string[];
}

export interface PracticeMatch {
  resource: PracticeResource;
  confidence: number; // 0-1
  matchReason: string;
  timestamp?: number; // When in the video this was detected
}

// ============================================================================
// Curated Problem Database
// ============================================================================

/**
 * Popular LeetCode problems mapped by exact name.
 * Updated: 2026-02 with commonly recommended problems.
 */
export const LEETCODE_PROBLEMS: Record<string, PracticeResource> = {
  // Array & Hashing
  'two sum': {
    platform: 'leetcode',
    problemId: '1',
    title: 'Two Sum',
    difficulty: 'easy',
    url: 'https://leetcode.com/problems/two-sum/',
    concepts: ['array', 'hash map', 'complement'],
  },
  'contains duplicate': {
    platform: 'leetcode',
    problemId: '217',
    title: 'Contains Duplicate',
    difficulty: 'easy',
    url: 'https://leetcode.com/problems/contains-duplicate/',
    concepts: ['array', 'hash set', 'sorting'],
  },
  'valid anagram': {
    platform: 'leetcode',
    problemId: '242',
    title: 'Valid Anagram',
    difficulty: 'easy',
    url: 'https://leetcode.com/problems/valid-anagram/',
    concepts: ['string', 'hash map', 'sorting', 'frequency count'],
  },
  'group anagrams': {
    platform: 'leetcode',
    problemId: '49',
    title: 'Group Anagrams',
    difficulty: 'medium',
    url: 'https://leetcode.com/problems/group-anagrams/',
    concepts: ['string', 'hash map', 'sorting'],
  },
  'top k frequent elements': {
    platform: 'leetcode',
    problemId: '347',
    title: 'Top K Frequent Elements',
    difficulty: 'medium',
    url: 'https://leetcode.com/problems/top-k-frequent-elements/',
    concepts: ['array', 'hash map', 'heap', 'bucket sort'],
  },
  'product of array except self': {
    platform: 'leetcode',
    problemId: '238',
    title: 'Product of Array Except Self',
    difficulty: 'medium',
    url: 'https://leetcode.com/problems/product-of-array-except-self/',
    concepts: ['array', 'prefix sum'],
  },

  // Two Pointers
  'valid palindrome': {
    platform: 'leetcode',
    problemId: '125',
    title: 'Valid Palindrome',
    difficulty: 'easy',
    url: 'https://leetcode.com/problems/valid-palindrome/',
    concepts: ['string', 'two pointers'],
  },
  'three sum': {
    platform: 'leetcode',
    problemId: '15',
    title: '3Sum',
    difficulty: 'medium',
    url: 'https://leetcode.com/problems/3sum/',
    concepts: ['array', 'two pointers', 'sorting'],
  },
  '3sum': {
    platform: 'leetcode',
    problemId: '15',
    title: '3Sum',
    difficulty: 'medium',
    url: 'https://leetcode.com/problems/3sum/',
    concepts: ['array', 'two pointers', 'sorting'],
  },
  'container with most water': {
    platform: 'leetcode',
    problemId: '11',
    title: 'Container With Most Water',
    difficulty: 'medium',
    url: 'https://leetcode.com/problems/container-with-most-water/',
    concepts: ['array', 'two pointers', 'greedy'],
  },

  // Sliding Window
  'best time to buy and sell stock': {
    platform: 'leetcode',
    problemId: '121',
    title: 'Best Time to Buy and Sell Stock',
    difficulty: 'easy',
    url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/',
    concepts: ['array', 'sliding window', 'dynamic programming'],
  },
  'longest substring without repeating characters': {
    platform: 'leetcode',
    problemId: '3',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'medium',
    url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
    concepts: ['string', 'sliding window', 'hash set'],
  },
  'minimum window substring': {
    platform: 'leetcode',
    problemId: '76',
    title: 'Minimum Window Substring',
    difficulty: 'hard',
    url: 'https://leetcode.com/problems/minimum-window-substring/',
    concepts: ['string', 'sliding window', 'hash map'],
  },

  // Stack
  'valid parentheses': {
    platform: 'leetcode',
    problemId: '20',
    title: 'Valid Parentheses',
    difficulty: 'easy',
    url: 'https://leetcode.com/problems/valid-parentheses/',
    concepts: ['string', 'stack'],
  },

  // Binary Search
  'binary search': {
    platform: 'leetcode',
    problemId: '704',
    title: 'Binary Search',
    difficulty: 'easy',
    url: 'https://leetcode.com/problems/binary-search/',
    concepts: ['array', 'binary search'],
  },
  'search in rotated sorted array': {
    platform: 'leetcode',
    problemId: '33',
    title: 'Search in Rotated Sorted Array',
    difficulty: 'medium',
    url: 'https://leetcode.com/problems/search-in-rotated-sorted-array/',
    concepts: ['array', 'binary search'],
  },

  // Linked List
  'reverse linked list': {
    platform: 'leetcode',
    problemId: '206',
    title: 'Reverse Linked List',
    difficulty: 'easy',
    url: 'https://leetcode.com/problems/reverse-linked-list/',
    concepts: ['linked list', 'recursion'],
  },
  'merge two sorted lists': {
    platform: 'leetcode',
    problemId: '21',
    title: 'Merge Two Sorted Lists',
    difficulty: 'easy',
    url: 'https://leetcode.com/problems/merge-two-sorted-lists/',
    concepts: ['linked list', 'recursion'],
  },
  'linked list cycle': {
    platform: 'leetcode',
    problemId: '141',
    title: 'Linked List Cycle',
    difficulty: 'easy',
    url: 'https://leetcode.com/problems/linked-list-cycle/',
    concepts: ['linked list', 'two pointers', 'floyd cycle'],
  },

  // Trees
  'invert binary tree': {
    platform: 'leetcode',
    problemId: '226',
    title: 'Invert Binary Tree',
    difficulty: 'easy',
    url: 'https://leetcode.com/problems/invert-binary-tree/',
    concepts: ['binary tree', 'recursion', 'dfs'],
  },
  'maximum depth of binary tree': {
    platform: 'leetcode',
    problemId: '104',
    title: 'Maximum Depth of Binary Tree',
    difficulty: 'easy',
    url: 'https://leetcode.com/problems/maximum-depth-of-binary-tree/',
    concepts: ['binary tree', 'recursion', 'dfs', 'bfs'],
  },
  'same tree': {
    platform: 'leetcode',
    problemId: '100',
    title: 'Same Tree',
    difficulty: 'easy',
    url: 'https://leetcode.com/problems/same-tree/',
    concepts: ['binary tree', 'recursion', 'dfs'],
  },
  'validate binary search tree': {
    platform: 'leetcode',
    problemId: '98',
    title: 'Validate Binary Search Tree',
    difficulty: 'medium',
    url: 'https://leetcode.com/problems/validate-binary-search-tree/',
    concepts: ['binary tree', 'binary search tree', 'dfs', 'inorder'],
  },
  'lowest common ancestor': {
    platform: 'leetcode',
    problemId: '236',
    title: 'Lowest Common Ancestor of a Binary Tree',
    difficulty: 'medium',
    url: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/',
    concepts: ['binary tree', 'recursion', 'dfs'],
  },

  // Graphs
  'number of islands': {
    platform: 'leetcode',
    problemId: '200',
    title: 'Number of Islands',
    difficulty: 'medium',
    url: 'https://leetcode.com/problems/number-of-islands/',
    concepts: ['graph', 'dfs', 'bfs', 'matrix'],
  },
  'clone graph': {
    platform: 'leetcode',
    problemId: '133',
    title: 'Clone Graph',
    difficulty: 'medium',
    url: 'https://leetcode.com/problems/clone-graph/',
    concepts: ['graph', 'dfs', 'bfs', 'hash map'],
  },
  'course schedule': {
    platform: 'leetcode',
    problemId: '207',
    title: 'Course Schedule',
    difficulty: 'medium',
    url: 'https://leetcode.com/problems/course-schedule/',
    concepts: ['graph', 'topological sort', 'dfs', 'cycle detection'],
  },

  // Dynamic Programming
  'climbing stairs': {
    platform: 'leetcode',
    problemId: '70',
    title: 'Climbing Stairs',
    difficulty: 'easy',
    url: 'https://leetcode.com/problems/climbing-stairs/',
    concepts: ['dynamic programming', 'fibonacci', 'memoization'],
  },
  'house robber': {
    platform: 'leetcode',
    problemId: '198',
    title: 'House Robber',
    difficulty: 'medium',
    url: 'https://leetcode.com/problems/house-robber/',
    concepts: ['dynamic programming', 'array'],
  },
  'coin change': {
    platform: 'leetcode',
    problemId: '322',
    title: 'Coin Change',
    difficulty: 'medium',
    url: 'https://leetcode.com/problems/coin-change/',
    concepts: ['dynamic programming', 'bfs'],
  },
  'longest increasing subsequence': {
    platform: 'leetcode',
    problemId: '300',
    title: 'Longest Increasing Subsequence',
    difficulty: 'medium',
    url: 'https://leetcode.com/problems/longest-increasing-subsequence/',
    concepts: ['dynamic programming', 'binary search'],
  },

  // Backtracking
  'subsets': {
    platform: 'leetcode',
    problemId: '78',
    title: 'Subsets',
    difficulty: 'medium',
    url: 'https://leetcode.com/problems/subsets/',
    concepts: ['backtracking', 'recursion', 'bit manipulation'],
  },
  'combination sum': {
    platform: 'leetcode',
    problemId: '39',
    title: 'Combination Sum',
    difficulty: 'medium',
    url: 'https://leetcode.com/problems/combination-sum/',
    concepts: ['backtracking', 'recursion'],
  },
  'permutations': {
    platform: 'leetcode',
    problemId: '46',
    title: 'Permutations',
    difficulty: 'medium',
    url: 'https://leetcode.com/problems/permutations/',
    concepts: ['backtracking', 'recursion'],
  },

  // Heap / Priority Queue
  'kth largest element': {
    platform: 'leetcode',
    problemId: '215',
    title: 'Kth Largest Element in an Array',
    difficulty: 'medium',
    url: 'https://leetcode.com/problems/kth-largest-element-in-an-array/',
    concepts: ['heap', 'quickselect', 'sorting'],
  },
  'merge k sorted lists': {
    platform: 'leetcode',
    problemId: '23',
    title: 'Merge k Sorted Lists',
    difficulty: 'hard',
    url: 'https://leetcode.com/problems/merge-k-sorted-lists/',
    concepts: ['linked list', 'heap', 'divide and conquer'],
  },
};

/**
 * Concept to problems mapping for fuzzy matching.
 * When a concept is detected, these problems are suggested.
 */
export const CONCEPT_TO_PROBLEMS: Record<string, string[]> = {
  // Data Structures
  'hash map': ['two sum', 'group anagrams', 'top k frequent elements'],
  'hashmap': ['two sum', 'group anagrams', 'top k frequent elements'],
  'hash table': ['two sum', 'group anagrams', 'top k frequent elements'],
  'hash set': ['contains duplicate', 'longest substring without repeating characters'],
  'array': ['two sum', 'contains duplicate', 'product of array except self'],
  'linked list': ['reverse linked list', 'merge two sorted lists', 'linked list cycle'],
  'stack': ['valid parentheses'],
  'queue': ['number of islands'],
  'heap': ['top k frequent elements', 'kth largest element', 'merge k sorted lists'],
  'priority queue': ['top k frequent elements', 'kth largest element'],
  'binary tree': ['invert binary tree', 'maximum depth of binary tree', 'same tree'],
  'binary search tree': ['validate binary search tree'],
  'bst': ['validate binary search tree'],
  'graph': ['number of islands', 'clone graph', 'course schedule'],

  // Algorithms
  'two pointers': ['valid palindrome', 'three sum', 'container with most water'],
  'sliding window': ['best time to buy and sell stock', 'longest substring without repeating characters', 'minimum window substring'],
  'binary search': ['binary search', 'search in rotated sorted array'],
  'dfs': ['number of islands', 'invert binary tree', 'maximum depth of binary tree'],
  'depth first search': ['number of islands', 'invert binary tree'],
  'bfs': ['number of islands', 'maximum depth of binary tree'],
  'breadth first search': ['number of islands'],
  'recursion': ['climbing stairs', 'reverse linked list', 'subsets'],
  'dynamic programming': ['climbing stairs', 'house robber', 'coin change', 'longest increasing subsequence'],
  'dp': ['climbing stairs', 'house robber', 'coin change'],
  'memoization': ['climbing stairs', 'house robber'],
  'backtracking': ['subsets', 'combination sum', 'permutations'],
  'topological sort': ['course schedule'],
  'greedy': ['best time to buy and sell stock', 'container with most water'],

  // Specific Patterns
  'prefix sum': ['product of array except self'],
  'floyd cycle': ['linked list cycle'],
  'tortoise and hare': ['linked list cycle'],
  'divide and conquer': ['merge k sorted lists'],
  'quickselect': ['kth largest element'],
};

// ============================================================================
// Matcher Functions
// ============================================================================

/**
 * Detect exact problem mentions in text.
 * Returns matches with high confidence.
 */
export function detectExactProblemMentions(text: string): PracticeMatch[] {
  const matches: PracticeMatch[] = [];
  const normalizedText = text.toLowerCase();

  // Check for LeetCode number patterns (e.g., "LeetCode 1", "LC 217", "problem 15")
  const lcNumberPattern = /(?:leetcode|lc|problem)\s*#?\s*(\d+)/gi;
  let match;
  while ((match = lcNumberPattern.exec(normalizedText)) !== null) {
    const problemId = match[1];
    const resource = Object.values(LEETCODE_PROBLEMS).find(p => p.problemId === problemId);
    if (resource) {
      matches.push({
        resource,
        confidence: 0.95,
        matchReason: `Exact mention: LeetCode #${problemId}`,
      });
    }
  }

  // Check for exact problem name mentions
  for (const [key, resource] of Object.entries(LEETCODE_PROBLEMS)) {
    // Create regex with word boundaries
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedKey}\\b`, 'i');
    
    if (regex.test(normalizedText)) {
      // Avoid duplicates
      if (!matches.some(m => m.resource.problemId === resource.problemId)) {
        matches.push({
          resource,
          confidence: 0.9,
          matchReason: `Problem mentioned: "${resource.title}"`,
        });
      }
    }
  }

  return matches;
}

/**
 * Detect concept-based practice opportunities.
 * Returns matches with medium confidence.
 */
export function detectConceptBasedMatches(text: string): PracticeMatch[] {
  const matches: PracticeMatch[] = [];
  const seenProblems = new Set<string>();
  const normalizedText = text.toLowerCase();

  for (const [concept, problemKeys] of Object.entries(CONCEPT_TO_PROBLEMS)) {
    const escapedConcept = concept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedConcept}\\b`, 'i');
    
    if (regex.test(normalizedText)) {
      for (const problemKey of problemKeys) {
        const resource = LEETCODE_PROBLEMS[problemKey];
        if (resource && !seenProblems.has(resource.problemId)) {
          seenProblems.add(resource.problemId);
          matches.push({
            resource,
            confidence: 0.7,
            matchReason: `Concept: ${concept}`,
          });
        }
      }
    }
  }

  // Sort by confidence and limit to top 5
  return matches.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

/**
 * Main matcher function.
 * Combines exact and concept-based matching with preference for exact matches.
 * V2: Added content type gating and context validation.
 */
export function findPracticeOpportunities(
  text: string,
  options: { 
    maxResults?: number; 
    minConfidence?: number;
    /** If set to 'entertainment', returns empty array immediately */
    contentType?: 'coding_tutorial' | 'tech_lecture' | 'educational_other' | 'entertainment' | 'tech_review' | 'mixed';
  } = {}
): PracticeMatch[] {
  const { maxResults = 3, minConfidence = 0.7, contentType } = options;

  // Gate: Skip matching entirely for entertainment content
  if (contentType === 'entertainment') {
    console.log('[LeetCodeMatcher] Skipping - content type is entertainment');
    return [];
  }

  // Gate: Skip for tech reviews (no actionable learning)
  if (contentType === 'tech_review') {
    console.log('[LeetCodeMatcher] Skipping - content type is tech review');
    return [];
  }

  // Get exact matches first (higher priority)
  const exactMatches = detectExactProblemMentions(text);
  
  // Get concept-based matches
  const conceptMatches = detectConceptBasedMatches(text);
  
  // Context validation: For concept matches, require multiple concept signals
  // This prevents false positives from single keyword matches
  const validatedConceptMatches = conceptMatches.filter(match => {
    // If we have exact matches, concept matches are supplementary
    if (exactMatches.length > 0) return true;
    
    // For concept-only matching, require higher confidence OR multiple concept mentions
    const conceptsInText = match.resource.concepts.filter(c => 
      text.toLowerCase().includes(c.toLowerCase())
    ).length;
    
    // Require at least 2 concept mentions for higher confidence
    return conceptsInText >= 2 || match.confidence >= 0.8;
  });
  
  // Combine and deduplicate (prefer exact matches)
  const seenIds = new Set(exactMatches.map(m => m.resource.problemId));
  const combined = [
    ...exactMatches,
    ...validatedConceptMatches.filter(m => !seenIds.has(m.resource.problemId)),
  ];

  // Filter by minimum confidence and limit results
  return combined
    .filter(m => m.confidence >= minConfidence)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxResults);
}

/**
 * Generate a practice checkpoint from a match.
 */
export function createPracticeCheckpoint(
  match: PracticeMatch,
  timestamp: number
): {
  type: 'practice_resource';
  timestamp: number;
  title: string;
  content: {
    type: 'practice_resource';
    platform: Platform;
    problemId: string;
    title: string;
    url: string;
    difficulty: Difficulty;
    matchConfidence: number;
    matchReason: string;
  };
} {
  return {
    type: 'practice_resource',
    timestamp,
    title: `Practice: ${match.resource.title}`,
    content: {
      type: 'practice_resource',
      platform: match.resource.platform,
      problemId: match.resource.problemId,
      title: match.resource.title,
      url: match.resource.url,
      difficulty: match.resource.difficulty,
      matchConfidence: match.confidence,
      matchReason: match.matchReason,
    },
  };
}
