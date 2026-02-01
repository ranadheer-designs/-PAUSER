/**
 * Concept Extractor
 *
 * Extracts key programming concepts using a keyword dictionary.
 * Deterministic and extensible.
 */

// ============================================================================
// Dictionary
// ============================================================================

/**
 * General Programming & Web Development Dictionary.
 * Can be extended with domain-specific dictionaries later.
 */
export const GENERAL_PROGRAMMING_DICTIONARY: Record<string, string[]> = {
  // Core Concepts
  "Algorithm": ["algorithm", "algorithms", "algorithmic", "complexity", "big o"],
  "Data Structure": ["data structure", "data structures", "array", "arrays", "linked list", "hash map", "tree", "trees", "graph", "graphs"],
  "Recursion": ["recursion", "recursive", "base case"],
  "Iteration": ["iteration", "loop", "loops", "for loop", "while loop"],
  "Function": ["function", "functions", "method", "methods", "procedure", "subroutine"],
  "Variable": ["variable", "variables", "const", "let", "var", "assignment"],
  
  // Async
  "Asynchronous": ["async", "await", "promise", "promises", "callback", "callbacks", "non-blocking"],
  "Concurrency": ["concurrency", "parallelism", "thread", "threads", "process", "processes"],
  
  // Web
  "API": ["api", "rest", "endpoint", "request", "response"],
  "HTTP": ["http", "https", "status code", "header"],
  "DOM": ["dom", "document object model", "element", "selector"],
  
  // JavaScript/TypeScript specific
  "Closure": ["closure", "lexical scope"],
  "Hoisting": ["hoisting"],
  "Prototype": ["prototype", "inheritance", "class"],
  
  // React
  // React & UI
  "React": ["react", "jsx", "tsx"],
  "Component": ["component", "components", "render", "element", "elements"],
  "Hook": ["hook", "hooks", "usestate", "useeffect", "usecontext", "custom hook"],
  "State": ["state", "props", "context", "reducer"],
};

// ============================================================================
// Extractor
// ============================================================================

/**
 * Extract concepts from text using a keyword dictionary.
 * Rules:
 * - Case insensitive matching
 * - Returns unique concept names (keys of the dictionary)
 * - Deterministic output
 */
export function extractConceptsRuleBased(
  text: string,
  dictionary: Record<string, string[]> = GENERAL_PROGRAMMING_DICTIONARY
): string[] {
  const extracted = new Set<string>();
  const normalizedText = text.toLowerCase();

  for (const [concept, keywords] of Object.entries(dictionary)) {
    for (const keyword of keywords) {
      // Use word boundary regex to avoid partial matches (e.g. "state" in "statement")
      // Escape special regex characters in keyword if necessary
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
      
      if (regex.test(normalizedText)) {
        extracted.add(concept);
        break; // Found one keyword for this concept, move to next concept
      }
    }
  }

  return Array.from(extracted).sort();
}

/**
 * AI Concept Extraction (Feature Flagged)
 * 
 * Uses an LLM to extract concepts that might be missed by the dictionary.
 * Requires `ENABLE_AI_EXTRACTION=true` and an API key.
 */
export async function extractConceptsAI(
  text: string,
  options: { enabled?: boolean; apiKey?: string; model?: string } = {}
): Promise<string[]> {
  const { enabled = false, apiKey, model = "gpt-4o-mini" } = options;

  if (!enabled || !apiKey) {
    return []; // Feature disabled or missing key
  }

  try {
    // TODO: Replace with your preferred AI SDK or fetch call
    // const response = await fetch("https://api.openai.com/v1/chat/completions", {
    //   headers: { Authorization: `Bearer ${apiKey}` },
    //   body: JSON.stringify({
    //     model,
    //     messages: [
    //       { role: "system", content: "Extract programming concepts from the text. Return JSON array of strings." },
    //       { role: "user", content: text }
    //     ]
    //   })
    // });
    
    // For now, return empty to prevent runtime errors until SDK is added
    console.warn("AI Extraction enabled but not fully implemented in @pauser/common");
    return [];
  } catch (error) {
    console.error("AI extraction failed:", error);
    return [];
  }
}
