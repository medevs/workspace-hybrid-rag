import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate embedding for a single text
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    input: text,
    encoding_format: 'float',
  });

  return response.data[0].embedding;
}

// Generate embeddings for multiple texts (batched)
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const response = await openai.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    input: texts,
    encoding_format: 'float',
  });

  // Sort by index to maintain order
  return response.data
    .sort((a, b) => a.index - b.index)
    .map(d => d.embedding);
}

// Batch embed chunks with rate limiting
export async function batchEmbedChunks(
  chunks: Array<{ id: string; text: string }>,
  batchSize = 20
): Promise<Map<string, number[]>> {
  const embeddings = new Map<string, number[]>();

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map(c => c.text);

    const embeddingResults = await generateEmbeddings(texts);
    batch.forEach((chunk, index) => {
      embeddings.set(chunk.id, embeddingResults[index]);
    });

    // Rate limit: wait 100ms between batches
    if (i + batchSize < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return embeddings;
}
