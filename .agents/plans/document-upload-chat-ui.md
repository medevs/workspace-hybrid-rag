# Feature: Document Upload, Processing & Chat UI

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Implement a full document management and conversational Q&A interface with:
- **Left Panel**: Drag-and-drop file upload zone + scrollable list of uploaded documents with delete functionality
- **Right Panel**: Chat interface for asking questions about uploaded documents using hybrid RAG search

The system will:
1. Accept document uploads (txt, pdf, docx)
2. Parse and chunk documents into 500-800 token segments
3. Generate embeddings using OpenAI text-embedding-3-small
4. Store documents, chunks, and embeddings in Supabase with workspace isolation
5. Provide hybrid search (semantic + keyword with RRF) for Q&A
6. Stream AI responses using GPT-4o-mini

## User Story

As an authenticated workspace member,
I want to upload documents and ask questions about them,
So that I can quickly find information from my team's knowledge base.

## Problem Statement

Users need a centralized way to store organizational documents and retrieve information through natural language queries. Currently, the application has authentication but no document management or chat functionality.

## Solution Statement

Build a split-panel UI where users can:
1. Drag-and-drop files to upload (left panel, top)
2. View and delete uploaded documents (left panel, bottom)
3. Ask questions and receive AI-generated answers with source citations (right panel)

The backend will process documents through a RAG pipeline: parse → chunk → embed → store. Queries will use hybrid search (pgvector semantic + full-text keyword) merged with RRF ranking.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**: Database schema, API routes, lib utilities, UI components
**Dependencies**: OpenAI SDK, Supabase (pgvector), react-dropzone

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `app/auth/signup/page.tsx` (lines 1-212) - Why: Form pattern with React Hook Form + Zod, toast notifications, loading states, Supabase client usage
- `app/auth/callback/route.ts` (lines 1-40) - Why: Server-side route handler pattern with Supabase, user session extraction
- `lib/supabase/server.ts` (lines 1-27) - Why: Server-side Supabase client creation pattern
- `lib/supabase/client.ts` - Why: Browser-side Supabase client creation pattern
- `lib/validations/auth.ts` (lines 1-25) - Why: Zod schema pattern for form validation
- `types/index.ts` (lines 1-67) - Why: Existing type definitions (Document, Chunk, SearchResult, ChatMessage, ApiError)
- `components/ui/button.tsx` - Why: Button component with variants
- `components/ui/card.tsx` - Why: Card component for containers
- `components/ui/scroll-area.tsx` - Why: ScrollArea component for scrollable lists
- `components/ui/skeleton.tsx` - Why: Loading skeleton pattern
- `env.ts` - Why: Environment variable schema (OPENAI_API_KEY, etc.)
- `.claude/reference/openai-integration.md` - Why: OpenAI embedding and chat patterns with exact code examples
- `.claude/reference/supabase-setup.md` - Why: Database schema, RLS policies, hybrid search SQL functions

### New Files to Create

**Database:**
- `supabase/migrations/20260121000006_create_documents_chunks_embeddings.sql` - Document, chunks, embeddings tables
- `supabase/migrations/20260121000007_create_rls_policies_documents.sql` - RLS policies for new tables
- `supabase/migrations/20260121000008_create_search_functions.sql` - Hybrid search SQL functions

**Library:**
- `lib/db.ts` - Replace stub with database utilities (getUserFromSession, admin client)
- `lib/embeddings.ts` - Replace stub with OpenAI embedding generation
- `lib/chunking.ts` - Replace stub with text chunking logic
- `lib/search.ts` - Replace stub with hybrid search (semantic + keyword + RRF)
- `lib/chat.ts` - Replace stub with RAG pipeline and streaming
- `lib/validations/documents.ts` - Zod schemas for document operations
- `lib/validations/chat.ts` - Zod schemas for chat operations

**API Routes:**
- `app/api/documents/route.ts` - Replace stub with POST (upload), GET (list), DELETE (remove)
- `app/api/chat/route.ts` - Replace stub with POST (streaming chat)

**Components:**
- `components/features/document-dropzone.tsx` - Drag-and-drop upload zone
- `components/features/document-list.tsx` - Scrollable list with delete
- `components/features/chat-interface.tsx` - Chat messages and input
- `components/features/chat-message.tsx` - Individual message display

**Pages:**
- `app/chat/page.tsx` - Replace stub with split-panel layout

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings)
  - Specific section: text-embedding-3-small usage
  - Why: Required for generating 1536-dimension vectors
- [OpenAI Chat Completions with Streaming](https://platform.openai.com/docs/api-reference/chat/create)
  - Specific section: stream parameter
  - Why: Needed for real-time response streaming
- [Supabase pgvector Guide](https://supabase.com/docs/guides/database/extensions/pgvector)
  - Specific section: HNSW indexes, similarity operators
  - Why: Vector search implementation
- [react-dropzone useDropzone Hook](https://react-dropzone.js.org/)
  - Specific section: Basic usage with accept prop
  - Why: File upload drag-and-drop functionality

### Patterns to Follow

**Naming Conventions:**
- API routes: kebab-case (`/api/documents`, `/api/chat`)
- Components: PascalCase (`DocumentDropzone.tsx`, `ChatInterface.tsx`)
- Utilities: camelCase (`generateEmbedding`, `hybridSearch`)
- Types: PascalCase with suffix (`DocumentUploadRequest`, `ChatResponse`)

**Error Handling:**
```typescript
// API route error pattern (from callback/route.ts)
return NextResponse.json(
  { error: 'Error message', code: 'ERROR_CODE' },
  { status: 400 }
);
```

**Form Pattern:**
```typescript
// From signup page
const form = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: { ... }
});

async function onSubmit(values: FormValues) {
  setIsLoading(true);
  try {
    // API call
  } catch (error) {
    toast.error('Error message');
  } finally {
    setIsLoading(false);
  }
}
```

**Supabase Server Query Pattern:**
```typescript
const supabase = await createClient();
const { data, error } = await supabase.from('table').select('*');
if (error) {
  console.error('Error:', error);
  throw new Error('Operation failed');
}
```

**Component Import Pattern:**
```typescript
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
```

---

## IMPLEMENTATION PLAN

### Phase 1: Database Foundation

**Tasks:**
- Create migration for documents, chunks, embeddings tables
- Create RLS policies for workspace isolation
- Create SQL functions for semantic and keyword search
- Apply migrations to database

### Phase 2: Core Library Implementation

**Tasks:**
- Implement database utilities (admin client, session helpers)
- Implement text chunking with sentence-aware splitting
- Implement OpenAI embedding generation (single + batch)
- Implement hybrid search with RRF ranking
- Implement RAG chat pipeline with streaming

### Phase 3: API Routes

**Tasks:**
- Implement document upload endpoint (parse, chunk, embed, store)
- Implement document list endpoint
- Implement document delete endpoint
- Implement chat endpoint with streaming

### Phase 4: UI Components

**Tasks:**
- Create document dropzone component
- Create document list with delete functionality
- Create chat interface with message display
- Create chat message component with sources
- Build split-panel page layout

### Phase 5: Integration & Testing

**Tasks:**
- Connect all components on chat page
- Test full upload → embed → search → chat flow
- Verify workspace isolation
- Test error handling and edge cases

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 1: CREATE `supabase/migrations/20260121000006_create_documents_chunks_embeddings.sql`

- **IMPLEMENT**: Create documents, chunks, embeddings tables with proper relationships and indexes
- **PATTERN**: Follow table structure from `.claude/reference/supabase-setup.md` (lines 30-58)
- **SQL**:
```sql
-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chunks table
CREATE TABLE chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  text TEXT NOT NULL,
  chunk_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Embeddings table (pgvector)
CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  embedding VECTOR(1536) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Foreign key indexes
CREATE INDEX idx_documents_workspace ON documents(workspace_id);
CREATE INDEX idx_documents_created_by ON documents(created_by);
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
- **GOTCHA**: pgvector extension must be enabled (already done in migration 000001)
- **VALIDATE**: `pnpm type-check` (no TypeScript changes yet)

### Task 2: CREATE `supabase/migrations/20260121000007_create_rls_policies_documents.sql`

- **IMPLEMENT**: Enable RLS and create policies for documents, chunks, embeddings
- **PATTERN**: Follow RLS pattern from `.claude/reference/supabase-setup.md` (lines 96-166)
- **SQL**:
```sql
-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- Documents: Workspace members can view
CREATE POLICY "Users can view workspace documents"
  ON documents FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Documents: Workspace members can insert
CREATE POLICY "Users can upload documents"
  ON documents FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Documents: Users can delete their own uploads
CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  USING (created_by = auth.uid());

-- Chunks: Workspace members can view
CREATE POLICY "Users can view workspace chunks"
  ON chunks FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Chunks: Workspace members can insert
CREATE POLICY "Users can insert chunks"
  ON chunks FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Chunks: Cascade delete handled by FK, but add policy for direct delete
CREATE POLICY "Users can delete workspace chunks"
  ON chunks FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Embeddings: View through chunk relationship
CREATE POLICY "Users can view workspace embeddings"
  ON embeddings FOR SELECT
  USING (chunk_id IN (
    SELECT id FROM chunks WHERE workspace_id IN
      (SELECT workspace_id FROM users WHERE id = auth.uid())
  ));

-- Embeddings: Insert through chunk relationship
CREATE POLICY "Users can insert embeddings"
  ON embeddings FOR INSERT
  WITH CHECK (chunk_id IN (
    SELECT id FROM chunks WHERE workspace_id IN
      (SELECT workspace_id FROM users WHERE id = auth.uid())
  ));

-- Embeddings: Delete through chunk relationship
CREATE POLICY "Users can delete embeddings"
  ON embeddings FOR DELETE
  USING (chunk_id IN (
    SELECT id FROM chunks WHERE workspace_id IN
      (SELECT workspace_id FROM users WHERE id = auth.uid())
  ));
```
- **GOTCHA**: RLS policies must reference `auth.uid()` for session-based filtering
- **VALIDATE**: `pnpm type-check`

### Task 3: CREATE `supabase/migrations/20260121000008_create_search_functions.sql`

- **IMPLEMENT**: Create SQL functions for semantic and keyword search
- **PATTERN**: Follow function pattern from `.claude/reference/supabase-setup.md` (lines 245-315)
- **SQL**:
```sql
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
```
- **GOTCHA**: MUST include `SET search_path = public, extensions` for `<=>` operator to work
- **VALIDATE**: `pnpm type-check`

### Task 4: Apply all migrations to Supabase

- **IMPLEMENT**: Use Supabase MCP to apply all 3 new migrations
- **PATTERN**: Use `mcp__supabase__apply_migration` tool
- **VALIDATE**: Query tables to confirm creation: `SELECT * FROM information_schema.tables WHERE table_schema = 'public'`

### Task 5: UPDATE `lib/db.ts` - Database utilities

- **IMPLEMENT**: Admin client creation and user session extraction
- **PATTERN**: Follow pattern from `.claude/reference/supabase-setup.md` (lines 215-238)
- **IMPORTS**: `@supabase/supabase-js`, `@/lib/supabase/server`
- **CODE**:
```typescript
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

// Admin client for server-side operations (bypasses RLS)
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Get user's workspace from session
export async function getUserFromSession() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  // Get user profile with workspace
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, workspace_id, email')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  return {
    userId: profile.id,
    workspaceId: profile.workspace_id,
    email: profile.email
  };
}
```
- **GOTCHA**: Always use `getUser()` not `getSession()` for server-side auth verification
- **VALIDATE**: `pnpm type-check`

### Task 6: UPDATE `lib/chunking.ts` - Text chunking

- **IMPLEMENT**: Sentence-aware text chunking targeting 500-800 tokens per chunk
- **PATTERN**: Custom implementation following CLAUDE.md chunking guidance
- **CODE**:
```typescript
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

// Parse different file types to plain text
export async function parseFileToText(file: File): Promise<string> {
  const fileType = file.type;
  const text = await file.text();

  // For now, just handle plain text
  // PDF and DOCX parsing would require additional libraries
  if (fileType === 'text/plain' || file.name.endsWith('.txt')) {
    return text;
  }

  // For other types, attempt to read as text
  // In production, use pdf-parse for PDFs and mammoth for DOCX
  return text;
}
```
- **GOTCHA**: Token estimation is approximate; real tokenization would use tiktoken
- **VALIDATE**: `pnpm type-check`

### Task 7: UPDATE `lib/embeddings.ts` - OpenAI embeddings

- **IMPLEMENT**: Single and batch embedding generation using OpenAI API
- **PATTERN**: Follow pattern from `.claude/reference/openai-integration.md` (lines 45-119)
- **IMPORTS**: `openai`
- **CODE**:
```typescript
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
```
- **GOTCHA**: text-embedding-3-small returns 1536 dimensions
- **VALIDATE**: `pnpm type-check`

### Task 8: UPDATE `lib/search.ts` - Hybrid search with RRF

- **IMPLEMENT**: Semantic + keyword search with Reciprocal Rank Fusion
- **PATTERN**: Follow pattern from `.claude/reference/supabase-setup.md` (lines 319-399)
- **IMPORTS**: `@/lib/db`, `@/lib/embeddings`, types from `@/types`
- **CODE**:
```typescript
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
  semanticResults.forEach((result: { chunk_id: string; document_id: string; text: string; chunk_order: number }, index: number) => {
    const rrfScore = calculateRRFScore(index + 1) * opts.semanticWeight!;
    merged.set(result.chunk_id, {
      chunk_id: result.chunk_id,
      document_id: result.document_id,
      text: result.text,
      chunk_order: result.chunk_order,
      score: rrfScore,
      source: 'semantic',
    });
  });

  // Process keyword results
  keywordResults.forEach((result: { chunk_id: string; document_id: string; text: string; chunk_order: number }, index: number) => {
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
      });
    }
  });

  // Sort by combined score, return top K
  return Array.from(merged.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.topK);
}
```
- **GOTCHA**: RPC functions return data or error; check both
- **VALIDATE**: `pnpm type-check`

### Task 9: UPDATE `lib/chat.ts` - RAG pipeline with streaming

- **IMPLEMENT**: RAG chat generation with streaming responses
- **PATTERN**: Follow pattern from `.claude/reference/openai-integration.md` (lines 122-199)
- **IMPORTS**: `openai`, `@/lib/search`, types from `@/types`
- **CODE**:
```typescript
import OpenAI from 'openai';
import { hybridSearch } from '@/lib/search';
import type { SearchResult } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a helpful assistant answering questions based on provided documents.
Answer only using the following context. If the answer is not in the context, say "I couldn't find information about that in the available documents."
Be concise and accurate. Always cite which document the information comes from when possible.
Format your response in markdown when appropriate.`;

interface RAGContext {
  question: string;
  workspaceId: string;
}

interface RAGResponse {
  answer: string;
  sources: SearchResult[];
}

// Build context string from search results
function buildContext(results: SearchResult[]): string {
  return results
    .map((r, i) => `[Document ${i + 1}]:\n${r.text}`)
    .join('\n\n');
}

// Non-streaming RAG response
export async function generateRAGAnswer(config: RAGContext): Promise<RAGResponse> {
  const { question, workspaceId } = config;

  // Search for relevant chunks
  const searchResults = await hybridSearch(question, workspaceId);

  if (searchResults.length === 0) {
    return {
      answer: "I couldn't find any relevant information in the available documents. Please try a different question or upload more documents.",
      sources: [],
    };
  }

  const context = buildContext(searchResults);

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
    ],
    temperature: 0.5,
    max_completion_tokens: 1000,
  });

  return {
    answer: response.choices[0].message.content || '',
    sources: searchResults,
  };
}

// Streaming RAG response generator
export async function* generateRAGAnswerStream(
  config: RAGContext
): AsyncGenerator<{ type: 'sources' | 'text' | 'done'; data?: SearchResult[] | string }> {
  const { question, workspaceId } = config;

  // Search for relevant chunks
  const searchResults = await hybridSearch(question, workspaceId);

  // Yield sources first
  yield { type: 'sources', data: searchResults };

  if (searchResults.length === 0) {
    yield {
      type: 'text',
      data: "I couldn't find any relevant information in the available documents. Please try a different question or upload more documents."
    };
    yield { type: 'done' };
    return;
  }

  const context = buildContext(searchResults);

  const stream = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
    ],
    temperature: 0.5,
    max_completion_tokens: 1000,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield { type: 'text', data: content };
    }
  }

  yield { type: 'done' };
}
```
- **GOTCHA**: Use `max_completion_tokens` not `max_tokens` for gpt-4o-mini
- **VALIDATE**: `pnpm type-check`

### Task 10: CREATE `lib/validations/documents.ts` - Document validation schemas

- **IMPLEMENT**: Zod schemas for document API requests
- **PATTERN**: Follow pattern from `lib/validations/auth.ts`
- **CODE**:
```typescript
import { z } from 'zod';

export const documentUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  content: z.string().min(1, 'Content is required'),
  fileType: z.string().optional(),
  fileSize: z.number().optional(),
});

export const documentDeleteSchema = z.object({
  documentId: z.string().uuid('Invalid document ID'),
});

export type DocumentUploadRequest = z.infer<typeof documentUploadSchema>;
export type DocumentDeleteRequest = z.infer<typeof documentDeleteSchema>;
```
- **VALIDATE**: `pnpm type-check`

### Task 11: CREATE `lib/validations/chat.ts` - Chat validation schemas

- **IMPLEMENT**: Zod schemas for chat API requests
- **PATTERN**: Follow pattern from `lib/validations/auth.ts`
- **CODE**:
```typescript
import { z } from 'zod';

export const chatRequestSchema = z.object({
  question: z.string().min(1, 'Question is required').max(2000, 'Question too long'),
  stream: z.boolean().optional().default(true),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
```
- **VALIDATE**: `pnpm type-check`

### Task 12: UPDATE `app/api/documents/route.ts` - Document API

- **IMPLEMENT**: POST (upload with processing), GET (list), DELETE endpoints
- **PATTERN**: Follow route handler pattern from `app/auth/callback/route.ts`
- **IMPORTS**: NextResponse, Zod schemas, db utilities, chunking, embeddings
- **CODE**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession, createAdminClient } from '@/lib/db';
import { chunkText } from '@/lib/chunking';
import { generateEmbeddings } from '@/lib/embeddings';
import { documentUploadSchema, documentDeleteSchema } from '@/lib/validations/documents';

export async function POST(request: NextRequest) {
  const user = await getUserFromSession();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON', code: 'INVALID_JSON' },
      { status: 400 }
    );
  }

  const parsed = documentUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { filename, content, fileType, fileSize } = parsed.data;
  const supabase = createAdminClient();

  try {
    // 1. Create document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        workspace_id: user.workspaceId,
        filename,
        file_type: fileType,
        file_size: fileSize,
        created_by: user.userId,
      })
      .select()
      .single();

    if (docError) throw docError;

    // 2. Chunk the text
    const textChunks = chunkText(content);

    // 3. Create chunk records
    const chunkRecords = textChunks.map((text, index) => ({
      document_id: document.id,
      workspace_id: user.workspaceId,
      text,
      chunk_order: index,
    }));

    const { data: chunks, error: chunkError } = await supabase
      .from('chunks')
      .insert(chunkRecords)
      .select();

    if (chunkError) throw chunkError;

    // 4. Generate embeddings
    const embeddingInputs = chunks.map(c => ({ id: c.id, text: c.text }));
    const embeddings = await generateEmbeddings(embeddingInputs.map(e => e.text));

    // 5. Store embeddings
    const embeddingRecords = chunks.map((chunk, index) => ({
      chunk_id: chunk.id,
      embedding: embeddings[index],
    }));

    const { error: embError } = await supabase
      .from('embeddings')
      .insert(embeddingRecords);

    if (embError) throw embError;

    return NextResponse.json({
      documentId: document.id,
      filename: document.filename,
      chunks: chunks.length,
      message: 'Document uploaded and processed successfully',
    });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process document', code: 'PROCESSING_ERROR' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const user = await getUserFromSession();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  const supabase = createAdminClient();

  try {
    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, filename, file_type, file_size, created_at, created_by')
      .eq('workspace_id', user.workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Document list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromSession();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('id');

  const parsed = documentDeleteSchema.safeParse({ documentId });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid document ID', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  try {
    // Check ownership
    const { data: doc, error: fetchError } = await supabase
      .from('documents')
      .select('created_by')
      .eq('id', documentId)
      .eq('workspace_id', user.workspaceId)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json(
        { error: 'Document not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (doc.created_by !== user.userId) {
      return NextResponse.json(
        { error: 'You can only delete your own documents', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Delete document (cascades to chunks and embeddings)
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    console.error('Document delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete document', code: 'DELETE_ERROR' },
      { status: 500 }
    );
  }
}
```
- **GOTCHA**: Cascade delete on documents FK handles chunks/embeddings cleanup
- **VALIDATE**: `pnpm type-check`

### Task 13: UPDATE `app/api/chat/route.ts` - Chat API with streaming

- **IMPLEMENT**: POST endpoint with streaming RAG responses
- **PATTERN**: Follow streaming pattern from `.claude/reference/openai-integration.md` (lines 246-292)
- **CODE**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/db';
import { generateRAGAnswerStream } from '@/lib/chat';
import { chatRequestSchema } from '@/lib/validations/chat';

export async function POST(request: NextRequest) {
  const user = await getUserFromSession();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON', code: 'INVALID_JSON' },
      { status: 400 }
    );
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { question, stream } = parsed.data;

  try {
    if (stream) {
      // Streaming response
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            const generator = generateRAGAnswerStream({
              question,
              workspaceId: user.workspaceId,
            });

            for await (const chunk of generator) {
              const data = JSON.stringify(chunk) + '\n';
              controller.enqueue(encoder.encode(data));
            }
          } catch (error) {
            console.error('Streaming error:', error);
            const errorChunk = JSON.stringify({
              type: 'error',
              data: error instanceof Error ? error.message : 'Generation failed',
            }) + '\n';
            controller.enqueue(encoder.encode(errorChunk));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Non-streaming response (for completeness)
    const { generateRAGAnswer } = await import('@/lib/chat');
    const response = await generateRAGAnswer({
      question,
      workspaceId: user.workspaceId,
    });
    return NextResponse.json(response);

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Chat generation failed', code: 'CHAT_ERROR' },
      { status: 500 }
    );
  }
}
```
- **GOTCHA**: Use chunked transfer encoding for streaming
- **VALIDATE**: `pnpm type-check`

### Task 14: CREATE `components/features/document-dropzone.tsx`

- **IMPLEMENT**: Drag-and-drop file upload zone using react-dropzone
- **PATTERN**: Follow shadcn/ui component patterns
- **IMPORTS**: react-dropzone, lucide-react, shadcn components
- **FIRST**: Install react-dropzone: `pnpm add react-dropzone`
- **CODE**:
```typescript
'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DocumentDropzoneProps {
  onUploadComplete?: () => void;
}

export function DocumentDropzone({ onUploadComplete }: DocumentDropzoneProps) {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);

    for (const file of acceptedFiles) {
      try {
        const content = await file.text();

        const response = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            content,
            fileType: file.type,
            fileSize: file.size,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        const result = await response.json();
        toast.success(`${file.name} uploaded (${result.chunks} chunks)`);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setIsUploading(false);
    onUploadComplete?.();
  }, [onUploadComplete]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    disabled: isUploading,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
        'hover:border-primary/50 hover:bg-accent/50',
        isDragActive && 'border-primary bg-accent',
        isDragAccept && 'border-green-500 bg-green-50 dark:bg-green-950/20',
        isDragReject && 'border-destructive bg-destructive/10',
        isUploading && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center gap-3">
        {isDragReject ? (
          <>
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-destructive">File type not supported</p>
          </>
        ) : isDragAccept ? (
          <>
            <FileText className="h-10 w-10 text-green-600" />
            <p className="text-sm text-green-600">Drop to upload</p>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {isUploading ? 'Uploading...' : 'Drag & drop files here'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports TXT, PDF, DOCX (max 10MB)
              </p>
            </div>
          </>
        )}

        {!isDragActive && !isUploading && (
          <Button variant="outline" size="sm" className="mt-2">
            Browse files
          </Button>
        )}
      </div>
    </div>
  );
}
```
- **VALIDATE**: `pnpm type-check`

### Task 15: CREATE `components/features/document-list.tsx`

- **IMPLEMENT**: Scrollable list of documents with delete functionality
- **PATTERN**: Follow shadcn/ui patterns, use ScrollArea
- **CODE**:
```typescript
'use client';

import { useState, useEffect } from 'react';
import { Trash2, FileText, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { Document } from '@/types';

interface DocumentListProps {
  refreshTrigger?: number;
}

export function DocumentList({ refreshTrigger }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [refreshTrigger]);

  const handleDelete = async (documentId: string, filename: string) => {
    setDeletingId(documentId);

    try {
      const response = await fetch(`/api/documents?id=${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }

      setDocuments(prev => prev.filter(d => d.id !== documentId));
      toast.success(`${filename} deleted`);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No documents yet</p>
        <p className="text-xs mt-1">Upload files to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Documents ({documents.length})</h3>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={fetchDocuments}
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-[300px]">
        <div className="space-y-2 pr-4">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <FileText className="h-8 w-8 text-muted-foreground shrink-0" />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={doc.filename}>
                  {doc.filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(doc.id, doc.filename)}
                disabled={deletingId === doc.id}
                title="Delete document"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
```
- **VALIDATE**: `pnpm type-check`

### Task 16: CREATE `components/features/chat-message.tsx`

- **IMPLEMENT**: Individual chat message display with sources
- **PATTERN**: Follow shadcn/ui patterns
- **CODE**:
```typescript
'use client';

import { User, Bot, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 py-4',
        isUser && 'flex-row-reverse'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn('flex-1 space-y-2', isUser && 'text-right')}>
        <div
          className={cn(
            'inline-block rounded-lg px-4 py-2 max-w-[80%]',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          )}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.sources.map((source, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-accent/50 rounded px-2 py-1"
                title={source.excerpt}
              >
                <FileText className="h-3 w-3" />
                <span className="truncate max-w-[150px]">{source.filename}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```
- **VALIDATE**: `pnpm type-check`

### Task 17: CREATE `components/features/chat-interface.tsx`

- **IMPLEMENT**: Full chat interface with message list and input
- **PATTERN**: Use streaming fetch, ScrollArea
- **CODE**:
```typescript
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './chat-message';
import type { ChatMessage as ChatMessageType, SearchResult } from '@/types';

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = useCallback(async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    // Add user message
    const userMessage: ChatMessageType = {
      role: 'user',
      content: question,
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Start with empty assistant message
    const assistantMessage: ChatMessageType = {
      role: 'assistant',
      content: '',
      sources: [],
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, stream: true }),
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const chunk = JSON.parse(line);

            if (chunk.type === 'sources') {
              // Update sources
              const sources = (chunk.data as SearchResult[]).map(s => ({
                filename: s.filename || `Document chunk ${s.chunk_order + 1}`,
                excerpt: s.text.substring(0, 100) + '...',
              }));
              setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                updated[lastIdx] = { ...updated[lastIdx], sources };
                return updated;
              });
            } else if (chunk.type === 'text') {
              // Append text
              accumulatedContent += chunk.data;
              setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                updated[lastIdx] = { ...updated[lastIdx], content: accumulatedContent };
                return updated;
              });
            } else if (chunk.type === 'error') {
              throw new Error(chunk.data);
            }
          } catch (parseError) {
            // Skip invalid JSON lines
            console.warn('Parse error:', parseError);
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get response');
      // Remove the empty assistant message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-lg font-medium">Ask a question</p>
            <p className="text-sm">Your AI assistant will search the knowledge base</p>
          </div>
        ) : (
          <div className="py-4 space-y-2">
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            {isLoading && messages[messages.length - 1]?.content === '' && (
              <div className="flex items-center gap-2 text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Searching documents...</span>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents..."
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="shrink-0 h-[60px] w-[60px]"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
```
- **VALIDATE**: `pnpm type-check`

### Task 18: UPDATE `app/chat/page.tsx` - Split panel layout

- **IMPLEMENT**: Main page with left panel (upload + documents) and right panel (chat)
- **PATTERN**: Follow existing page patterns
- **CODE**:
```typescript
'use client';

import { useState } from 'react';
import { DocumentDropzone } from '@/components/features/document-dropzone';
import { DocumentList } from '@/components/features/document-list';
import { ChatInterface } from '@/components/features/chat-interface';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function ChatPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Panel - Documents */}
      <div className="w-80 border-r flex flex-col bg-background">
        <div className="p-4 space-y-4 flex-1 overflow-hidden flex flex-col">
          <div>
            <h2 className="text-lg font-semibold mb-3">Upload Documents</h2>
            <DocumentDropzone onUploadComplete={handleUploadComplete} />
          </div>

          <Separator />

          <div className="flex-1 overflow-hidden">
            <DocumentList refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>

      {/* Right Panel - Chat */}
      <div className="flex-1 flex flex-col">
        <div className="border-b px-6 py-4">
          <h1 className="text-xl font-semibold">Knowledge Base Chat</h1>
          <p className="text-sm text-muted-foreground">
            Ask questions about your uploaded documents
          </p>
        </div>

        <div className="flex-1 overflow-hidden">
          <ChatInterface />
        </div>
      </div>
    </div>
  );
}
```
- **VALIDATE**: `pnpm type-check`

### Task 19: Install react-dropzone dependency

- **IMPLEMENT**: Add react-dropzone package
- **COMMAND**: `pnpm add react-dropzone`
- **VALIDATE**: `pnpm list react-dropzone`

### Task 20: Run type check and lint

- **IMPLEMENT**: Verify all TypeScript compiles correctly
- **VALIDATE**: `pnpm type-check && pnpm lint`

### Task 21: Apply database migrations

- **IMPLEMENT**: Apply all 3 new migrations to Supabase
- **PATTERN**: Use `mcp__supabase__apply_migration` for each migration file
- **VALIDATE**: Query tables to confirm schema

### Task 22: Manual testing

- **IMPLEMENT**: Test full flow
- **STEPS**:
  1. Run `pnpm dev`
  2. Navigate to `/auth/login`, sign in
  3. Navigate to `/chat`
  4. Upload a text document
  5. Verify document appears in list
  6. Ask a question about the document
  7. Verify streaming response with sources
  8. Delete the document
  9. Verify deletion

---

## TESTING STRATEGY

### Unit Tests

**Scope**: `lib/chunking.ts`, `lib/search.ts` (RRF algorithm)

Design unit tests for:
- `chunkText()` - Test chunking produces expected number of chunks within token limits
- `calculateRRFScore()` - Verify RRF math is correct
- Validation schemas - Test edge cases

### Integration Tests

**Scope**: API endpoints with test database

Test:
- `/api/documents` POST - Upload flow
- `/api/documents` GET - List retrieval
- `/api/documents` DELETE - Deletion with ownership check
- `/api/chat` POST - Full RAG pipeline

### Edge Cases

- Empty document upload
- Very large documents (>10MB rejection)
- Questions with no matching results
- Malformed JSON requests
- Unauthenticated requests
- Cross-workspace access attempts
- Concurrent uploads

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
pnpm type-check
pnpm lint
```

### Level 2: Build

```bash
pnpm build
```

### Level 3: Unit Tests

```bash
pnpm test
```

### Level 4: Manual Validation

1. Start dev server: `pnpm dev`
2. Login at `/auth/login`
3. Navigate to `/chat`
4. Upload `.txt` file via drag-and-drop
5. Verify toast shows chunk count
6. Verify document appears in list
7. Ask question about document content
8. Verify streaming response
9. Verify sources shown
10. Delete document
11. Verify removal from list

---

## ACCEPTANCE CRITERIA

- [x] Split-panel UI with left (documents) and right (chat) panels
- [x] Drag-and-drop file upload zone accepts TXT, PDF, DOCX
- [x] Documents are chunked and embedded on upload
- [x] Document list shows all workspace documents with metadata
- [x] Users can delete only their own documents
- [x] Chat interface sends questions and displays streaming responses
- [x] Sources are shown with each AI response
- [x] Hybrid search (semantic + keyword) with RRF ranking
- [x] Workspace isolation enforced via RLS
- [x] All TypeScript compiles without errors
- [x] All validation commands pass
- [x] Responsive layout works on different screen sizes

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability

---

## NOTES

### Design Decisions

1. **react-dropzone over native drag-drop**: More robust browser support and better UX with visual feedback

2. **Streaming by default**: Better UX for longer responses; non-streaming available as fallback

3. **Admin client for search**: Uses service role key to bypass RLS for vector search performance; workspace filtering done in SQL function

4. **Token estimation vs tiktoken**: Using simple 4-char estimate to avoid dependency; accurate enough for chunking

5. **Cascade deletes**: Document deletion cascades to chunks/embeddings via FK constraints

### Potential Improvements (Out of Scope)

- PDF parsing with `pdf-parse`
- DOCX parsing with `mammoth`
- Markdown rendering in chat responses
- Conversation history persistence
- Document preview modal
- Search filters by document type
- Export chat history

### Known Limitations

- PDF/DOCX files are read as text (binary content won't parse correctly without proper libraries)
- No progress bar during upload (could add with XMLHttpRequest)
- Chat history is lost on page refresh (stored only in React state)

### Confidence Score

**8/10** - High confidence due to:
- Clear patterns from existing codebase
- Reference documentation with code examples
- Well-defined database schema
- Standard React/Next.js patterns

Risk factors:
- pgvector search function syntax needs testing
- Streaming API needs browser testing
- File parsing for PDF/DOCX is basic
