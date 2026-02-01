import { ChallengeTemplate } from './types';
import * as templates from './templates';

const ALL_TEMPLATES: ChallengeTemplate[] = Object.values(templates);

/**
 * Result of a challenge match attempt.
 */
export interface MatchResult {
  template: ChallengeTemplate | null;
  matchScore: number;
  matchReason: string;
  matchedConcepts: string[];
}

/**
 * Select templates that match the given concepts.
 * Returns templates sorted by relevance (number of matching concepts) and difficulty.
 * @deprecated Use matchChallenge() for single best match with explanation.
 */
export function selectTemplates(
  concepts: string[],
  maxResults = 3
): ChallengeTemplate[] {
  const normalizedConcepts = concepts.map(c => c.toLowerCase());

  // Score each template
  const scored = ALL_TEMPLATES.map(template => {
    let matches = 0;
    for (const c of template.concepts) {
      if (normalizedConcepts.includes(c.toLowerCase())) {
        matches++;
      }
    }
    return { template, matches };
  });

  // Filter and sort
  return scored
    .filter(item => item.matches > 0)
    .sort((a, b) => {
      // Prioritize match count
      if (b.matches !== a.matches) return b.matches - a.matches;
      // Then difficulty (lower first = "start easy")
      return a.template.difficulty - b.template.difficulty;
    })
    .map(item => item.template)
    .slice(0, maxResults);
}

/**
 * Find the single best challenge template for a set of concepts.
 * Deterministic and explainable.
 */
export function matchChallenge(concepts: string[]): MatchResult {
  const normalizedConcepts = new Set(concepts.map(c => c.toLowerCase()));

  // 1. Score all templates
  const scored = ALL_TEMPLATES.map(template => {
    const templateConcepts = template.concepts.map(c => c.toLowerCase());
    const matched = templateConcepts.filter(c => normalizedConcepts.has(c));
    
    // Score logic:
    // How much of the TEMPLATE is covered by the CHECKPOINT concepts?
    // We want the challenge to be *relevant* to what was just learned.
    // Score = (matched concepts) / (total template concepts)
    const score = templateConcepts.length > 0 
      ? matched.length / templateConcepts.length 
      : 0;

    return {
      template,
      score,
      matched
    };
  });

  // 2. Filter out non-matches
  const candidates = scored.filter(s => s.score > 0);

  if (candidates.length === 0) {
    return {
      template: null,
      matchScore: 0,
      matchReason: "No suitable challenge found for concepts: " + concepts.join(", "),
      matchedConcepts: []
    };
  }

  // 3. Sort candidates
  candidates.sort((a, b) => {
    // Primary: Score (relevance)
    if (Math.abs(b.score - a.score) > 0.01) return b.score - a.score;
    // Secondary: Difficulty (lower is better for initial learning)
    if (a.template.difficulty !== b.template.difficulty) return a.template.difficulty - b.template.difficulty;
    // Tertiary: ID (stable sort)
    return a.template.id.localeCompare(b.template.id);
  });

  const best = candidates[0];

  return {
    template: best.template,
    matchScore: best.score,
    matchReason: `Matched ${best.matched.length}/${best.template.concepts.length} concepts: ${best.matched.join(", ")}`,
    matchedConcepts: best.matched
  };
}

/**
 * Get a specific template by ID.
 */
export function getTemplateById(id: string): ChallengeTemplate | undefined {
  return ALL_TEMPLATES.find(t => t.id === id);
}
