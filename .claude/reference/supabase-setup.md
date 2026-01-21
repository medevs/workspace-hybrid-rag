# Supabase Setup & Best Practices

## Database Initialization

### Creating Tables

Use migrations to create and modify schema. Store migrations in `supabase/migrations/` directory.

```sql
-- Enable extensions first
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create workspaces table (pre-seeded via migration)
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create users table (links to Supabase Auth)
-- No role column - all users are equal within a workspace
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create documents table (any user can upload)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  filename TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chunks table (text segments from documents)
CREATE TABLE chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  text TEXT NOT NULL,
  chunk_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create embeddings table (pgvector)
CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  embedding VECTOR(1536) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Create Indexes

```sql
-- Foreign key indexes
CREATE INDEX idx_users_workspace ON users(workspace_id);
CREATE INDEX idx_documents_workspace ON documents(workspace_id);
CREATE INDEX idx_chunks_document ON chunks(document_id);
CREATE INDEX idx_chunks_workspace ON chunks(workspace_id);
CREATE INDEX idx_embeddings_chunk ON embeddings(chunk_id);

-- HNSW index for vector similarity search
CREATE INDEX idx_embeddings_hnsw ON embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- GIN index for full-text search
CREATE INDEX idx_chunks_text_search ON chunks
  USING GIN (to_tsvector('english', text));
```

### Seed Workspaces

```sql
-- Pre-seed workspaces (users select at signup)
INSERT INTO workspaces (id, name) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acme Corporation'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'TechStart Inc'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Demo Workspace');
```

## Row-Level Security (RLS)

RLS enforces multi-tenancy at the database level. All queries are automatically filtered.

### Enable RLS on All Tables

```sql
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
```

### RLS Policies (No Admin Roles)

```sql
-- Workspaces: Public for signup selection
CREATE POLICY "Anyone can view workspaces"
  ON workspaces FOR SELECT
  USING (true);

-- Users: Can view members of their workspace
CREATE POLICY "Users can view workspace members"
  ON users FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Users: Can insert their own profile (during signup callback)
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- Documents: Any workspace member can view
CREATE POLICY "Users can view workspace documents"
  ON documents FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Documents: Any workspace member can upload
CREATE POLICY "Users can upload documents"
  ON documents FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Documents: Users can delete their own uploads
CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  USING (created_by = auth.uid());

-- Chunks: Any workspace member can view
CREATE POLICY "Users can view workspace chunks"
  ON chunks FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Chunks: Any workspace member can insert (during document upload)
CREATE POLICY "Users can insert chunks"
  ON chunks FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Embeddings: Workspace members can view
CREATE POLICY "Users can view workspace embeddings"
  ON embeddings FOR SELECT
  USING (
    chunk_id IN (
      SELECT id FROM chunks WHERE workspace_id IN
        (SELECT workspace_id FROM users WHERE id = auth.uid())
    )
  );

-- Embeddings: Workspace members can insert
CREATE POLICY "Users can insert embeddings"
  ON embeddings FOR INSERT
  WITH CHECK (
    chunk_id IN (
      SELECT id FROM chunks WHERE workspace_id IN
        (SELECT workspace_id FROM users WHERE id = auth.uid())
    )
  );
```

## Connection & Setup in Next.js

### Initialize Supabase Clients

**File: `lib/supabase/client.ts`** (Browser)

```typescript
import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**File: `lib/supabase/server.ts`** (Server Components)

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

**File: `lib/db.ts`** (Admin Client)

```typescript
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Admin client for server-side operations (bypasses RLS)
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Get user's workspace from session headers
export function getUserFromHeaders(headers: Headers) {
  const userId = headers.get('x-user-id');
  const workspaceId = headers.get('x-workspace-id');
  const email = headers.get('x-user-email');

  if (!userId || !workspaceId) return null;

  return { userId, workspaceId, email };
}
```

## Hybrid Search Functions

### Semantic Search (pgvector)

```sql
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
SET search_path = public, extensions  -- IMPORTANT: Include extensions for <=> operator
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
```

### Keyword Search (Full-Text)

```sql
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
```

## Hybrid Search Implementation (TypeScript)

```typescript
// lib/search.ts
import { createAdminClient } from '@/lib/db';
import { generateEmbedding } from '@/lib/embeddings';

const DEFAULT_OPTIONS = {
  semanticWeight: 0.7,
  keywordWeight: 0.3,
  semanticLimit: 20,
  keywordLimit: 20,
  topK: 5,
  similarityThreshold: 0.7,
};

// Reciprocal Rank Fusion
function calculateRRFScore(ranks: number[], k = 60): number {
  return ranks.reduce((sum, rank) => sum + 1 / (k + rank), 0);
}

// Hybrid search combining semantic and keyword
export async function hybridSearch(
  query: string,
  workspaceId: string,
  options = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const supabase = createAdminClient();

  // Generate embedding for query
  const embedding = await generateEmbedding(query);

  // Execute both searches in parallel
  const [semanticResults, keywordResults] = await Promise.all([
    supabase.rpc('match_chunks', {
      query_embedding: embedding,
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

  // Merge with RRF
  const merged = new Map();

  // Process semantic results (70% weight)
  (semanticResults.data || []).forEach((result, index) => {
    const rrfScore = calculateRRFScore([index + 1]) * opts.semanticWeight;
    merged.set(result.chunk_id, {
      ...result,
      score: rrfScore,
      source: 'semantic',
    });
  });

  // Process keyword results (30% weight)
  (keywordResults.data || []).forEach((result, index) => {
    const rrfScore = calculateRRFScore([index + 1]) * opts.keywordWeight;
    const existing = merged.get(result.chunk_id);

    if (existing) {
      existing.score += rrfScore;
      existing.source = 'hybrid';
    } else {
      merged.set(result.chunk_id, {
        ...result,
        score: rrfScore,
        source: 'keyword',
      });
    }
  });

  // Sort by combined score, return top K
  return Array.from(merged.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.topK);
}
```

## Performance Tuning

**For datasets with 100K+ embeddings:**

1. **Use HNSW Index** (better recall, more memory):
   ```sql
   CREATE INDEX ON embeddings USING hnsw (embedding vector_cosine_ops)
     WITH (m = 16, ef_construction = 64);
   ```

2. **Tune HNSW parameters**:
   - `m`: Higher = better recall, more memory (default 16)
   - `ef_construction`: Higher = better quality, slower build (default 64)

3. **Monitor index size**:
   ```sql
   SELECT pg_size_pretty(pg_total_relation_size('embeddings'));
   ```

4. **Batch Operations**: Insert embeddings in batches of 100-500

## Best Practices

**Connection Pooling**: Use Supabase's connection pooler for high-traffic applications.

**Query Optimization**: Always select only needed columns. Use joins instead of multiple queries.

**Error Handling**: Always check `error` in responses.

```typescript
const { data, error } = await supabase.from('documents').select('*');
if (error) {
  console.error('Database error:', error.message);
  throw new Error(`Database operation failed: ${error.code}`);
}
```

**RLS Debugging**: If queries return empty results unexpectedly, check that:
1. User is authenticated (`auth.uid()` is set)
2. User has a profile in `users` table
3. RLS policies allow the operation

**pgvector Schema Issue**: Functions using `<=>` operator MUST include `extensions` in search_path:
```sql
SET search_path = public, extensions
```

## References

- [pgvector: Embeddings and vector similarity | Supabase Docs](https://supabase.com/docs/guides/database/extensions/pgvector)
- [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [RAG with Permissions | Supabase Docs](https://supabase.com/docs/guides/ai/rag-with-permissions)
