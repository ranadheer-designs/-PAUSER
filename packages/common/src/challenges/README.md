# Coding Challenges Documentation

This directory contains deterministic coding challenge templates for Pauser.

## Logic Flow

1. **Checkpoint Analysis**: Concepts are extracted (e.g., `['Array', 'Iteration']`).
2. **Selection**: `selectTemplates()` finds relevant challenges.
3. **Instantiation**: `testFactory()` generates test cases.
4. **Execution**: User code is run against tests via `challenge-engine`.

## Adding a New Template

1. Determine the relevant concepts (must match `concept-extractor.ts` keys).
2. Create a new file in `templates/` or add to existing category.
3. Define the `ChallengeTemplate` object:
   - `id`: unique kebab-case string
   - `difficulty`: 1-5 (see `types.ts`)
   - `functionName`: matching starter code
   - `testFactory`: function returning array of `ChallengeTestCase`
4. Export it in `templates/index.ts`.

## Rules
- **Determinism**: Tests must be deterministic given a random seed (if implementing randomness).
- **Simplicity**: Challenges should be solvable in < 5 minutes.
- **No AI**: Grading relies **only** on input/output matching.
