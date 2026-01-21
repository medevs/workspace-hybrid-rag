import { createAdminClient } from '@/lib/db';
import { generateEmbedding } from '@/lib/embeddings';
import type { SearchResult } from '@/types';

interface SearchOptions {
  semanticWeight?: number;
  keywordWeight?: number;
  semanticLimit?: number;
  keywordLimit?: number;
  topK?: number;
  similarityThreshold?: number;
}

const DEFAULT_OPTIONS: SearchOptions = {
  semanticWeight: 0.7,
  keywordWeight: 0.3,
  semanticLimit: 20,
  keywordLimit: 20,
  topK: 5,
  similarityThreshold: 0.7,
};

// Reciprocal Rank Fusion score
function calculateRRFScore(rank: number, k = 60): number {
  return 1 / (k + rank);
}

// Hybrid search combining semantic and keyword
export async function hybridSearch(
  query: string,
  workspaceId: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const supabase = createAdminClient();

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);

  // Execute both searches in parallel
  const [semanticResult, keywordResult] = await Promise.all([
    supabase.rpc('match_chunks', {
      query_embedding: queryEmbedding,
      p_workspace_id: workspaceId,
      match_count: opts.semanticLimit,
      similarity_threshold: opts.similarityThreshold,
    }),
    supabase.rpc('match_chunks_keyword', {
      query_text: query,
      p_workspace_id: workspaceId,
      match_count: opts.keywordLimit,
    }),
  ]);

  const semanticResults = semanticResult.data || [];
  const keywordResults = keywordResult.data || [];

  // Merge with RRF
  const merged = new Map<string, SearchResult>();

  // Process semantic results
  semanticResults.forEach((result: { chunk_id: string; document_id: string; text: string; chunk_order: number; filename?: string }, index: number) => {
    const rrfScore = calculateRRFScore(index + 1) * opts.semanticWeight!;
    merged.set(result.chunk_id, {
      chunk_id: result.chunk_id,
      document_id: result.document_id,
      text: result.text,
      chunk_order: result.chunk_order,
      score: rrfScore,
      source: 'semantic',
      filename: result.filename,
    });
  });

  // Process keyword results
  keywordResults.forEach((result: { chunk_id: string; document_id: string; text: string; chunk_order: number; filename?: string }, index: number) => {
    const rrfScore = calculateRRFScore(index + 1) * opts.keywordWeight!;
    const existing = merged.get(result.chunk_id);

    if (existing) {
      existing.score += rrfScore;
      existing.source = 'hybrid';
    } else {
      merged.set(result.chunk_id, {
        chunk_id: result.chunk_id,
        document_id: result.document_id,
        text: result.text,
        chunk_order: result.chunk_order,
        score: rrfScore,
        source: 'keyword',
        filename: result.filename,
      });
    }
  });

  // Sort by combined score, return top K
  return Array.from(merged.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.topK);
}
