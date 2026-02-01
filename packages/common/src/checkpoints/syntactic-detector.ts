import { VideoSegment } from './types';

export enum ActionableType {
  CODE = 'code',
  SQL = 'sql',
  CLI = 'cli',
  FILE_OP = 'file_op', // File operations/paths
  FORMULA = 'formula', // Excel/Sheets
  TOOL = 'tool' // Docker, Git, etc commands
}

export interface ActionableBlock {
  segment: VideoSegment;
  confidence: number;
  detectedTypes: ActionableType[];
  matchedKeywords: string[];
}

/**
 * Fast Syntactic Detection (First Pass)
 * Runs lightweight heuristics on transcript blocks to detect actionable content.
 */
export class SyntacticDetector {
  
  // Regex Patterns
  private static PATTERNS: Record<ActionableType, RegExp[]> = {
    [ActionableType.CODE]: [
      /(function|const|let|var|class|import|export|return)\s+\w+/, // JS/TS keywords
      /(def|class|import|from|return)\s+\w+/, // Python keywords
      /(\{|\}|=>|;\s*$)/, // Syntax markers
    ],
    [ActionableType.SQL]: [
      /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|GROUP BY|ORDER BY)\b/i,
      /\b(CREATE|DROP|ALTER|TABLE)\b/i,
    ],
    [ActionableType.CLI]: [
      /^(npm|pnpm|yarn|docker|git|kubectl|aws|gcloud|node|python|go|cargo)\b/,
      /\s--(help|version|name|file)\b/,
    ],
    [ActionableType.FILE_OP]: [
      /(\/|\.\/|\.\.\/)[\w-\/]+\.\w+/, // File paths
      /\b(open|read|write|save|edit)\s+['"]?[\w-\/]+\.\w+['"]?/,
    ],
    [ActionableType.FORMULA]: [
      /^=([A-Z]+)\(/, // Excel formulas =SUM(...)
      /\b(VLOOKUP|INDEX|MATCH|SUM|AVERAGE|IF)\b/i,
    ],
    [ActionableType.TOOL]: [
      /\b(click|select|press|type|drag|drop)\b/i, // UI interactions
      /\b(configure|setting|preference|option)\b/i,
    ]
  };

  // Keyword Lists (Verbs & Nouns)
  private static KEYWORDS: Record<ActionableType, string[]> = {
    [ActionableType.CODE]: ['function', 'variable', 'loop', 'array', 'object', 'compile', 'runtime'],
    [ActionableType.SQL]: ['query', 'database', 'table', 'row', 'column', 'index', 'primary key'],
    [ActionableType.CLI]: ['terminal', 'command line', 'flag', 'argument', 'install', 'build'],
    [ActionableType.FILE_OP]: ['file', 'folder', 'directory', 'path', 'extension', 'save'],
    [ActionableType.FORMULA]: ['cell', 'sheet', 'formula', 'function', 'reference', 'pivot'],
    [ActionableType.TOOL]: ['button', 'menu', 'panel', 'tab', 'window', 'dialog']
  };

  /**
   * Detect actionable blocks in a list of segments
   */
  public detect(segments: VideoSegment[]): ActionableBlock[] {
    const results: ActionableBlock[] = [];

    for (const segment of segments) {
      const text = segment.transcriptChunk || "";
      if (!text || text.length < 5) continue;

      const detection = this.analyzeText(text);
      if (detection.confidence > 0.3) { // Threshold
        results.push({
          segment,
          ...detection
        });
      }
    }

    return results;
  }

  /**
   * Analyze a single text block
   */
  private analyzeText(text: string): { confidence: number; detectedTypes: ActionableType[]; matchedKeywords: string[] } {
    let maxConfidence = 0;
    const detectedTypes: Set<ActionableType> = new Set();
    const matchedKeywords: Set<string> = new Set();

    for (const type of Object.values(ActionableType)) {
      let typeScore = 0;

      // Check Regex
      const patterns = SyntacticDetector.PATTERNS[type];
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          typeScore += 0.4;
        }
      }

      // Check Keywords
      const keywords = SyntacticDetector.KEYWORDS[type];
      const lowerText = text.toLowerCase();
      let keywordHits = 0;
      for (const kw of keywords) {
        if (lowerText.includes(kw)) {
          keywordHits++;
          matchedKeywords.add(kw);
        }
      }
      // Diminishing returns for keywords
      typeScore += Math.min(0.5, keywordHits * 0.1);

      if (typeScore > 0) {
        detectedTypes.add(type);
        if (typeScore > maxConfidence) {
          maxConfidence = typeScore;
        }
      }
    }

    return {
      confidence: Math.min(1, maxConfidence),
      detectedTypes: Array.from(detectedTypes),
      matchedKeywords: Array.from(matchedKeywords)
    };
  }
}
