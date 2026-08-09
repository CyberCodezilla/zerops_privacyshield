import { BloomFilter } from 'bloom-filters';

export interface KnowledgeMatch {
  start: number;
  end: number;
  text: string;
  label: string;
}

class KnowledgeBaseEngine {
  private filter: BloomFilter;
  private knownTokens: Map<string, string>; // Normalized token -> Label mapping

  constructor() {
    // 1,000,000 items capacity with 0.1% false positive rate
    this.filter = BloomFilter.create(1000000, 0.001);
    this.knownTokens = new Map();

    // Load default seed dataset of confidential corporate assets
    this.loadDataset([
      { token: 'PROJECT_HYDRA', label: 'CONFIDENTIAL_PROJECT_CODENAME' },
      { token: 'PROJECT_MANHATTAN', label: 'CONFIDENTIAL_PROJECT_CODENAME' },
      { token: 'SECRET_CODENAME_X', label: 'CONFIDENTIAL_PROJECT_CODENAME' },
      { token: 'CORP_VAULT_KEY_2026', label: 'KNOWLEDGE_BASE_MATCH' }
    ]);
  }

  /**
   * Load initial sensitive dataset into the in-memory Bloom filter
   */
  public loadDataset(dataset: Array<{ token: string; label: string }>): void {
    for (const item of dataset) {
      const normalized = item.token.trim();
      if (normalized.length > 0) {
        this.filter.add(normalized);
        this.knownTokens.set(normalized, item.label || 'KNOWLEDGE_BASE_MATCH');
      }
    }
  }

  /**
   * Add a single item dynamically without restarting the service
   */
  public addToken(token: string, label: string = 'KNOWLEDGE_BASE_MATCH'): void {
    const normalized = token.trim();
    if (normalized.length > 0) {
      this.filter.add(normalized);
      this.knownTokens.set(normalized, label);
    }
  }

  /**
   * Scan prompt against knowledge base in < 0.1ms
   */
  public scan(text: string): KnowledgeMatch[] {
    const matches: KnowledgeMatch[] = [];
    if (!text || !text.trim()) return matches;

    // Tokenize text into words/strings
    const words = text.match(/\b[a-zA-Z0-9_\-\.]{3,}\b/g) || [];

    for (const word of words) {
      if (this.filter.has(word)) {
        // Confirm exact match against Map to prevent Bloom false positives
        const label = this.knownTokens.get(word);
        if (label) {
          let startIndex = 0;
          while ((startIndex = text.indexOf(word, startIndex)) !== -1) {
            matches.push({
              start: startIndex,
              end: startIndex + word.length,
              text: word,
              label
            });
            startIndex += word.length;
          }
        }
      }
    }

    return matches;
  }
}

export const knowledgeEngine = new KnowledgeBaseEngine();
