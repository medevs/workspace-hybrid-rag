-- Semantic search using pgvector
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding VECTOR(1536),
  p_workspace_id UUID,
  match_count INT DEFAULT 20,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  text TEXT,
  chunk_order INT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS chunk_id,
    c.document_id,
    c.text,
    c.chunk_order,
    (1 - (e.embedding <=> query_embedding))::FLOAT AS similarity
  FROM embeddings e
  JOIN chunks c ON e.chunk_id = c.id
  WHERE c.workspace_id = p_workspace_id
    AND (1 - (e.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Keyword search using full-text search
CREATE OR REPLACE FUNCTION match_chunks_keyword(
  query_text TEXT,
  p_workspace_id UUID,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  text TEXT,
  chunk_order INT,
  rank FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS chunk_id,
    c.document_id,
    c.text,
    c.chunk_order,
    ts_rank(to_tsvector('english', c.text), plainto_tsquery('english', query_text))::FLOAT AS rank
  FROM chunks c
  WHERE c.workspace_id = p_workspace_id
    AND to_tsvector('english', c.text) @@ plainto_tsquery('english', query_text)
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;
