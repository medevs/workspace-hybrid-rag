interface ChunkOptions {
  maxTokens?: number;
  minTokens?: number;
  overlap?: number;
}

const DEFAULT_OPTIONS: ChunkOptions = {
  maxTokens: 800,
  minTokens: 100,
  overlap: 50,
};

// Rough token estimation (4 chars per token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Split text into sentences
function splitIntoSentences(text: string): string[] {
  // Split on sentence boundaries while preserving the delimiter
  return text
    .replace(/([.!?])\s+/g, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// Main chunking function
export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const sentences = splitIntoSentences(text);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);

    // If single sentence exceeds max, force split by characters
    if (sentenceTokens > opts.maxTokens!) {
      // Flush current chunk
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [];
        currentTokens = 0;
      }
      // Split long sentence into smaller parts
      const words = sentence.split(' ');
      let part: string[] = [];
      let partTokens = 0;
      for (const word of words) {
        const wordTokens = estimateTokens(word + ' ');
        if (partTokens + wordTokens > opts.maxTokens!) {
          if (part.length > 0) {
            chunks.push(part.join(' '));
          }
          part = [word];
          partTokens = wordTokens;
        } else {
          part.push(word);
          partTokens += wordTokens;
        }
      }
      if (part.length > 0) {
        currentChunk = part;
        currentTokens = partTokens;
      }
      continue;
    }

    // Check if adding sentence would exceed max
    if (currentTokens + sentenceTokens > opts.maxTokens!) {
      // Only create chunk if it meets minimum
      if (currentTokens >= opts.minTokens!) {
        chunks.push(currentChunk.join(' '));
        // Add overlap from end of previous chunk
        const overlapSentences: string[] = [];
        let overlapTokens = 0;
        for (let i = currentChunk.length - 1; i >= 0 && overlapTokens < opts.overlap!; i--) {
          overlapSentences.unshift(currentChunk[i]);
          overlapTokens += estimateTokens(currentChunk[i]);
        }
        currentChunk = [...overlapSentences, sentence];
        currentTokens = overlapTokens + sentenceTokens;
      } else {
        // Keep accumulating if below minimum
        currentChunk.push(sentence);
        currentTokens += sentenceTokens;
      }
    } else {
      currentChunk.push(sentence);
      currentTokens += sentenceTokens;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}
