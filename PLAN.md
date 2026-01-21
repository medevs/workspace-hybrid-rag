# Interview Task: RAG System Implementation Plan

## Original Task (German → English)

### Goal
Build a small end-to-end feature based on a RAG (Retrieval-Augmented Generation) system. The system should answer questions based on its own knowledge base (e.g., docs, FAQs, product data) and be interactively usable via a simple frontend.

### Required Stack
- **Backend/API:** Next.js (Route Handlers / API Routes)
- **Persistence:** Supabase (Postgres + Vector Store / pgvector)
- **Frontend:** Next.js (React)
- Other libraries/services allowed as long as Next.js and Supabase are the foundation

### Requirements (Minimal)
| # | Requirement | Type |
|---|-------------|------|
| 1 | End-to-end interface: Simple UI where user asks question and sees answer | **MUST** |
| 2 | RAG concept: Answers based on a knowledge base (docs, FAQ, product info) | **MUST** |
| 3 | Persistence: Data stored in Supabase (documents, chunks, embeddings) | **MUST** |
| 4 | README: Problem description, architecture, setup instructions, design decisions | **MUST** |
| 5 | Multi-workspace/tenant separation in data model | **OPTIONAL (nice to have)** |

### Time Frame
- Planned effort: ~2-4 hours
- Focus: Understandable approach, NOT completeness or perfection

### Deliverables
- Repo link (GitHub/GitLab) or ZIP
- README (see above)
- Optional: Deployment link (e.g., Vercel + Supabase)

---

## Implementation Plan

Based on the requirements, here's what to build:

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐         ┌─────────────────────────────────────────────┐   │
│  │   USER      │         │              NEXT.JS APP                    │   │
│  │             │         │                                             │   │
│  │  1. Signup  │────────▶│  /auth/signup     → Create account         │   │
│  │  2. Login   │────────▶│  /auth/login      → Authenticate           │   │
│  │  3. Upload  │────────▶│  /documents       → Upload documents       │   │
│  │  4. Chat    │────────▶│  /chat            → Ask questions          │   │
│  │             │         │                                             │   │
│  └─────────────┘         │  API Routes:                                │   │
│                          │  POST /api/documents → Document ingestion   │   │
│                          │  POST /api/chat      → RAG pipeline         │   │
│                          └──────────────┬──────────────────────────────┘   │
│                                         │                                   │
│                                         ▼                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                           SUPABASE                                    │  │
│  │                                                                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │  auth.users │  │ workspaces  │  │  documents  │  │   chunks    │  │  │
│  │  │  (Supabase  │  │ (pre-seeded)│  │ (user       │  │             │  │  │
│  │  │   Auth)     │  │             │  │  uploaded)  │  │ - id        │  │  │
│  │  │             │  │ - id        │  │ - id        │  │ - document  │  │  │
│  │  └─────────────┘  │ - name      │  │ - workspace │  │ - text      │  │  │
│  │                   └─────────────┘  │ - filename  │  └──────┬──────┘  │  │
│  │                                    │ - created_by│         │         │  │
│  │  ┌─────────────┐                   └─────────────┘         │         │  │
│  │  │   users     │                   ┌─────────────┐         │         │  │
│  │  │ (profiles)  │                   │ embeddings  │◀────────┘         │  │
│  │  │             │                   │             │                   │  │
│  │  │ - id        │                   │ - chunk_id  │                   │  │
│  │  │ - workspace │                   │ - vector    │  pgvector         │  │
│  │  └─────────────┘                   └─────────────┘                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### User Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                               USER JOURNEY                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 1: AUTHENTICATION                                                      │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │   New User                          Returning User                     │ │
│  │       │                                   │                            │ │
│  │       ▼                                   ▼                            │ │
│  │   /auth/signup                       /auth/login                       │ │
│  │       │                                   │                            │ │
│  │       ▼                                   │                            │ │
│  │   Email + Password                        │                            │ │
│  │   + Select Workspace                      │                            │ │
│  │       │                                   │                            │ │
│  │       ▼                                   │                            │ │
│  │   Supabase Auth creates user              │                            │ │
│  │       │                                   │                            │ │
│  │       └───────────────┬───────────────────┘                            │ │
│  │                       ▼                                                │ │
│  │               Redirect to /chat                                        │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  STEP 2: UPLOAD DOCUMENTS (Build Knowledge Base)                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │   User navigates to /documents                                         │ │
│  │       │                                                                │ │
│  │       ▼                                                                │ │
│  │   Uploads file (txt, pdf, docx)                                        │ │
│  │       │                                                                │ │
│  │       ▼                                                                │ │
│  │   POST /api/documents                                                  │ │
│  │       │                                                                │ │
│  │       ▼                                                                │ │
│  │   ┌────────────────────────────────────────────────────────────────┐  │ │
│  │   │                    INGESTION PIPELINE                          │  │ │
│  │   │                                                                │  │ │
│  │   │  1. Parse document content                                     │  │ │
│  │   │                       │                                        │  │ │
│  │   │                       ▼                                        │  │ │
│  │   │  2. Chunk text (500-800 tokens per chunk)                      │  │ │
│  │   │                       │                                        │  │ │
│  │   │                       ▼                                        │  │ │
│  │   │  3. Generate embeddings (OpenAI text-embedding-3-small)        │  │ │
│  │   │                       │                                        │  │ │
│  │   │                       ▼                                        │  │ │
│  │   │  4. Store: document, chunks, embeddings                        │  │ │
│  │   │     (All tagged with user's workspace_id)                      │  │ │
│  │   │                                                                │  │ │
│  │   └────────────────────────────────────────────────────────────────┘  │ │
│  │       │                                                                │ │
│  │       ▼                                                                │ │
│  │   Document appears in user's workspace documents list                  │ │
│  │   (Visible to ALL users in same workspace)                             │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  STEP 3: ASK QUESTIONS                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │   User on /chat page                                                   │ │
│  │       │                                                                │ │
│  │       ▼                                                                │ │
│  │   Types question: "What is Acme's revenue?"                            │ │
│  │       │                                                                │ │
│  │       ▼                                                                │ │
│  │   POST /api/chat { question }                                          │ │
│  │       │                                                                │ │
│  │       ▼                                                                │ │
│  │   ┌────────────────────────────────────────────────────────────────┐  │ │
│  │   │                    RAG PIPELINE                                 │  │ │
│  │   │                                                                 │  │ │
│  │   │  1. Generate embedding for question (OpenAI)                    │  │ │
│  │   │                       │                                         │  │ │
│  │   │                       ▼                                         │  │ │
│  │   │  2. Vector search: Find similar chunks in USER'S WORKSPACE      │  │ │
│  │   │     (Only searches documents uploaded by workspace members)     │  │ │
│  │   │                       │                                         │  │ │
│  │   │                       ▼                                         │  │ │
│  │   │  3. Build context from top 5 chunks                             │  │ │
│  │   │                       │                                         │  │ │
│  │   │                       ▼                                         │  │ │
│  │   │  4. Send to LLM: "Answer based on this context"                 │  │ │
│  │   │                       │                                         │  │ │
│  │   │                       ▼                                         │  │ │
│  │   │  5. Return answer + sources                                     │  │ │
│  │   │                                                                 │  │ │
│  │   └────────────────────────────────────────────────────────────────┘  │ │
│  │       │                                                                │ │
│  │       ▼                                                                │ │
│  │   Display answer with source citations                                 │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Tables

```sql
-- 1. Workspaces (tenants) - PRE-SEEDED via migration
-- Each workspace represents a team/organization
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users (linked to Supabase Auth)
-- Each user selects a workspace at signup
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Documents - USER UPLOADED
-- Belong to a workspace, uploaded by any workspace member
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  filename TEXT NOT NULL,
  content_type TEXT,
  file_size INTEGER,
  created_by UUID REFERENCES users(id),  -- Who uploaded it
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Chunks
-- Text pieces from documents
CREATE TABLE chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  text TEXT NOT NULL,
  chunk_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Embeddings
-- Vector representations for similarity search
CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row-Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- Users can only see their workspace
CREATE POLICY "Users can view their workspace"
  ON workspaces FOR SELECT
  USING (id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Workspaces are public for selection at signup
CREATE POLICY "Anyone can view workspaces for signup"
  ON workspaces FOR SELECT
  USING (true);

-- Users can see all users in their workspace
CREATE POLICY "Users can view workspace members"
  ON users FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Users can view and insert documents in their workspace
CREATE POLICY "Users can view workspace documents"
  ON documents FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can upload documents to their workspace"
  ON documents FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Similar policies for chunks and embeddings...
```

### Hybrid Search Functions

The system uses **Hybrid RAG** combining semantic (vector) and keyword (full-text) search with RRF ranking.

#### 1. Semantic Search (pgvector)

```sql
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  p_workspace_id UUID,
  match_count INTEGER DEFAULT 20,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  text TEXT,
  chunk_order INTEGER,
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
```

#### 2. Keyword Search (Full-Text)

```sql
CREATE OR REPLACE FUNCTION match_chunks_keyword(
  query_text TEXT,
  p_workspace_id UUID,
  match_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  text TEXT,
  chunk_order INTEGER,
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

#### 3. Full-Text Search Index

```sql
-- GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_chunks_text_search
ON chunks USING GIN (to_tsvector('english', text));
```

---

## Hybrid RAG Strategy

### Why Hybrid Search?

Neither semantic nor keyword search alone is perfect:

| Search Type | Strengths | Weaknesses |
|-------------|-----------|------------|
| **Semantic (Vector)** | Understands meaning, synonyms, context | Misses exact terms, acronyms, names |
| **Keyword (Full-Text)** | Exact matches, names, technical terms | No semantic understanding |

**Hybrid Search** combines both for better recall and precision.

### The Hybrid RAG Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HYBRID RAG PIPELINE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User Question: "What is Acme's annual revenue?"                            │
│                            │                                                │
│                            ▼                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PARALLEL SEARCH                                   │   │
│  │                                                                      │   │
│  │   ┌─────────────────────┐         ┌─────────────────────┐           │   │
│  │   │  SEMANTIC SEARCH    │         │  KEYWORD SEARCH     │           │   │
│  │   │                     │         │                     │           │   │
│  │   │  1. Generate        │         │  1. Parse query     │           │   │
│  │   │     embedding       │         │     to tsquery      │           │   │
│  │   │                     │         │                     │           │   │
│  │   │  2. pgvector        │         │  2. Full-text       │           │   │
│  │   │     cosine <=>      │         │     ts_rank()       │           │   │
│  │   │                     │         │                     │           │   │
│  │   │  3. Return top 20   │         │  3. Return top 20   │           │   │
│  │   │     by similarity   │         │     by rank         │           │   │
│  │   └──────────┬──────────┘         └──────────┬──────────┘           │   │
│  │              │                               │                       │   │
│  │              └───────────────┬───────────────┘                       │   │
│  │                              │                                       │   │
│  │                              ▼                                       │   │
│  │   ┌─────────────────────────────────────────────────────────────┐   │   │
│  │   │              RECIPROCAL RANK FUSION (RRF)                    │   │   │
│  │   │                                                              │   │   │
│  │   │   RRF Score = Σ (1 / (k + rank))  where k = 60               │   │   │
│  │   │                                                              │   │   │
│  │   │   Weights:                                                   │   │   │
│  │   │   - Semantic: 70%  (captures meaning)                        │   │   │
│  │   │   - Keyword:  30%  (captures exact terms)                    │   │   │
│  │   │                                                              │   │   │
│  │   │   Items found in BOTH lists get combined scores              │   │   │
│  │   │   → These "hybrid" matches rank highest                      │   │   │
│  │   └─────────────────────────────────────────────────────────────┘   │   │
│  │                              │                                       │   │
│  │                              ▼                                       │   │
│  │                     Return Top 5 Results                             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                            │                                                │
│                            ▼                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CONTEXT BUILDING                                  │   │
│  │                                                                      │   │
│  │   [Document 1: company-profile.txt]                                  │   │
│  │   Acme Corporation Financial Overview:                               │   │
│  │   - Annual Revenue: $50 million                                      │   │
│  │   - Employees: 250 full-time staff...                                │   │
│  │                                                                      │   │
│  │   ---                                                                │   │
│  │                                                                      │   │
│  │   [Document 2: quarterly-report.pdf]                                 │   │
│  │   Q4 revenue breakdown...                                            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                            │                                                │
│                            ▼                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    LLM GENERATION                                    │   │
│  │                                                                      │   │
│  │   System: "Answer based on provided context only"                    │   │
│  │   User: "Context: [chunks]\n\nQuestion: What is Acme's revenue?"     │   │
│  │                                                                      │   │
│  │   → GPT-4o-mini generates answer with streaming                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                            │                                                │
│                            ▼                                                │
│  Answer: "Acme Corporation's annual revenue is $50 million."                │
│  Sources: [company-profile.txt, quarterly-report.pdf]                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### RRF Algorithm Implementation

```typescript
// Reciprocal Rank Fusion combines ranked lists
function calculateRRFScore(ranks: number[], k: number = 60): number {
  return ranks.reduce((sum, rank) => sum + 1 / (k + rank), 0);
}

// Merge semantic and keyword results
function mergeSearchResults(
  semanticResults: SemanticSearchResult[],
  keywordResults: KeywordSearchResult[],
  options: { semanticWeight: 0.7, keywordWeight: 0.3 }
): SearchResult[] {
  const merged = new Map<string, SearchResult>();

  // Process semantic results (70% weight)
  semanticResults.forEach((result, index) => {
    const rrfScore = calculateRRFScore([index + 1]) * options.semanticWeight;
    merged.set(result.chunkId, {
      ...result,
      score: rrfScore,
      source: 'semantic',
    });
  });

  // Process keyword results (30% weight)
  keywordResults.forEach((result, index) => {
    const rrfScore = calculateRRFScore([index + 1]) * options.keywordWeight;
    const existing = merged.get(result.chunkId);

    if (existing) {
      // Found in BOTH lists → combined score, marked as 'hybrid'
      existing.score += rrfScore;
      existing.source = 'hybrid';
    } else {
      merged.set(result.chunkId, {
        ...result,
        score: rrfScore,
        source: 'keyword',
      });
    }
  });

  // Sort by combined score, return top K
  return Array.from(merged.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
```

### Default Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| `semanticWeight` | 0.7 | Weight for vector search results |
| `keywordWeight` | 0.3 | Weight for full-text search results |
| `semanticLimit` | 20 | Max results from vector search |
| `keywordLimit` | 20 | Max results from full-text search |
| `topK` | 5 | Final results after RRF merge |
| `similarityThreshold` | 0.7 | Min cosine similarity for vector results |
| `k` (RRF constant) | 60 | Prevents over-weighting top ranks |

### Why This Works Well

1. **Semantic catches meaning**: "company earnings" → finds "annual revenue"
2. **Keyword catches specifics**: "Acme" → exact match on company name
3. **Hybrid boosts overlap**: Chunks matching BOTH get highest scores
4. **RRF is rank-agnostic**: Works across different scoring scales

---

## Seed Data Strategy

### Pre-Seeded Workspaces Only (NOT Documents)

Documents are uploaded by users, not seeded. Only workspaces are created via migration.

```sql
-- Create demo workspaces for users to join
INSERT INTO workspaces (id, name) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acme Corporation'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'TechStart Inc'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Demo Workspace');
```

### Why Pre-Seed Workspaces?

1. **Simplifies Signup** - Users select from existing workspaces instead of creating new ones
2. **Demo Ready** - Interview can show multi-workspace isolation immediately
3. **Realistic** - In real apps, workspaces are often pre-provisioned by admins

### Documents Are User-Uploaded

- Users navigate to `/documents` page
- Upload files (txt, pdf, docx)
- Documents are processed: chunked → embedded → stored
- Documents are visible to ALL users in the same workspace
- Each user can upload documents, building the shared knowledge base

---

## Project Structure

```
rag-app/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Landing page (redirect to login/chat)
│   ├── auth/
│   │   ├── login/page.tsx            # Login form
│   │   ├── signup/page.tsx           # Signup form + workspace selection
│   │   └── callback/route.ts         # Auth callback handler
│   ├── documents/
│   │   ├── page.tsx                  # Document list + upload form
│   │   └── layout.tsx                # Protected layout
│   ├── chat/
│   │   ├── layout.tsx                # Chat layout (requires auth)
│   │   └── page.tsx                  # Chat interface
│   └── api/
│       ├── documents/
│       │   └── route.ts              # POST /api/documents - Document upload
│       └── chat/
│           └── route.ts              # POST /api/chat - RAG endpoint
├── components/
│   ├── ui/                           # UI components (shadcn/ui)
│   ├── chat-input.tsx                # Question input
│   ├── chat-message.tsx              # Message display
│   ├── document-upload.tsx           # File upload form
│   ├── document-list.tsx             # List of workspace documents
│   └── workspace-select.tsx          # Workspace dropdown for signup
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   ├── server.ts                 # Server client
│   │   └── middleware.ts             # Middleware client
│   ├── embeddings.ts                 # OpenAI embeddings
│   ├── chunking.ts                   # Text chunking logic
│   ├── search.ts                     # Vector search
│   └── rag.ts                        # RAG pipeline
├── middleware.ts                     # Auth middleware
├── supabase/
│   └── migrations/
│       ├── 001_enable_extensions.sql
│       ├── 002_create_tables.sql
│       ├── 003_enable_rls.sql
│       ├── 004_create_rls_policies.sql
│       ├── 005_create_functions.sql
│       └── 006_seed_workspaces.sql   # ONLY workspaces, NOT documents
├── .env.local
├── README.md
└── package.json
```

---

## Signup Flow with Workspace Selection

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                     SIGNUP PAGE                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                                                         │  │
│   │   Email:     [_______________________]                  │  │
│   │                                                         │  │
│   │   Password:  [_______________________]                  │  │
│   │                                                         │  │
│   │   Workspace: [ Select a workspace    ▼]                 │  │
│   │              ┌─────────────────────────┐                │  │
│   │              │ ○ Acme Corporation      │                │  │
│   │              │ ○ TechStart Inc         │                │  │
│   │              │ ○ Demo Workspace        │                │  │
│   │              └─────────────────────────┘                │  │
│   │                                                         │  │
│   │   [        Create Account        ]                      │  │
│   │                                                         │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   Already have an account? Login                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Signup API Flow

```typescript
// 1. Fetch available workspaces on page load
const { data: workspaces } = await supabase
  .from('workspaces')
  .select('id, name')
  .order('name');

// 2. User fills form with email, password, workspace_id
// 3. Call Supabase Auth signup with workspace_id in metadata
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
    data: {
      workspace_id: selectedWorkspaceId,
    },
  },
});

// 4. In auth callback, create user profile with workspace_id
// app/auth/callback/route.ts
const workspaceId = user.user_metadata.workspace_id;
await supabase.from('users').insert({
  id: user.id,
  email: user.email,
  workspace_id: workspaceId,
});
```

---

## Document Upload Flow

### Upload Page UI

```
┌─────────────────────────────────────────────────────────────────┐
│                     DOCUMENTS PAGE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  UPLOAD NEW DOCUMENT                                    │  │
│   │                                                         │  │
│   │  ┌──────────────────────────────────────────────────┐  │  │
│   │  │                                                  │  │  │
│   │  │          Drop file here or click to browse       │  │  │
│   │  │                                                  │  │  │
│   │  │          Supported: .txt, .pdf, .docx            │  │  │
│   │  │                                                  │  │  │
│   │  └──────────────────────────────────────────────────┘  │  │
│   │                                                         │  │
│   │  [          Upload Document          ]                  │  │
│   │                                                         │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  WORKSPACE DOCUMENTS                                    │  │
│   │                                                         │  │
│   │  📄 company-profile.txt      Uploaded by john@acme.com  │  │
│   │  📄 product-faq.pdf          Uploaded by sarah@acme.com │  │
│   │  📄 pricing-guide.docx       Uploaded by you            │  │
│   │                                                         │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Upload API Flow

```typescript
// POST /api/documents
export async function POST(request: NextRequest) {
  const user = await getUser(request);
  const formData = await request.formData();
  const file = formData.get('file') as File;

  // 1. Parse file content
  const content = await parseDocument(file);

  // 2. Create document record
  const { data: document } = await supabase
    .from('documents')
    .insert({
      workspace_id: user.workspace_id,
      filename: file.name,
      content_type: file.type,
      file_size: file.size,
      created_by: user.id,
    })
    .select()
    .single();

  // 3. Chunk the content
  const chunks = chunkText(content, { maxTokens: 800 });

  // 4. Generate embeddings
  const embeddings = await generateEmbeddings(chunks);

  // 5. Store chunks and embeddings
  for (let i = 0; i < chunks.length; i++) {
    const { data: chunk } = await supabase
      .from('chunks')
      .insert({
        document_id: document.id,
        workspace_id: user.workspace_id,
        text: chunks[i],
        chunk_order: i,
      })
      .select()
      .single();

    await supabase
      .from('embeddings')
      .insert({
        chunk_id: chunk.id,
        embedding: embeddings[i],
      });
  }

  return NextResponse.json({ documentId: document.id, chunks: chunks.length });
}
```

---

## Implementation Phases

### Phase 1: Project Setup (20 min)

1. Create Next.js app with TypeScript and Tailwind
2. Install dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `openai`
3. Set up environment variables
4. Create Supabase project

### Phase 2: Database Setup (30 min)

1. Create migrations for all tables
2. Enable pgvector extension
3. Create RLS policies
4. Create vector search function
5. **Seed workspaces only** (NOT documents)

### Phase 3: Authentication (30 min)

1. Set up Supabase Auth clients (browser, server, middleware)
2. Create login page
3. Create signup page with workspace dropdown
4. Create auth callback handler
5. Create middleware to protect routes

### Phase 4: Document Upload (30 min)

1. Create document upload UI (`/documents` page)
2. Create file parsing utilities (txt, pdf, docx)
3. Create text chunking logic
4. Create embedding generation utility
5. Create POST /api/documents endpoint
6. Create document list component

### Phase 5: RAG Backend (30 min)

1. Create vector search function
2. Create RAG pipeline (search → context → LLM → answer)
3. Create POST /api/chat endpoint
4. Add workspace filtering to search

### Phase 6: Chat Frontend (30 min)

1. Create chat layout (protected)
2. Create chat input component
3. Create message display component
4. Handle API calls and state
5. Show sources/citations

### Phase 7: Documentation (15 min)

1. Write README with:
   - Problem description
   - Architecture diagram
   - Setup instructions
   - Design decisions

---

## Key Design Decisions (for README)

1. **Hybrid RAG with RRF Ranking** - Combines semantic search (pgvector) with keyword search (Postgres full-text) using Reciprocal Rank Fusion. Neither search alone is sufficient:
   - Semantic: understands meaning but misses exact names/acronyms
   - Keyword: finds exact terms but no semantic understanding
   - Hybrid: best of both worlds, chunks found in both lists rank highest

2. **70/30 Semantic-Keyword Weighting** - Semantic search weighted higher (70%) because meaning matters more than exact matches for Q&A. Keyword (30%) ensures specific terms aren't missed.

3. **Supabase Auth** - Built-in authentication, integrates seamlessly with RLS for data isolation.

4. **Workspace-based multi-tenancy** - Each user belongs to a workspace. Documents and queries are scoped to the workspace. Enforced via RLS policies.

5. **Pre-seeded workspaces, user-uploaded documents** - Workspaces are created via migration to simplify signup. Documents are uploaded by users to build the knowledge base organically.

6. **Shared workspace documents** - Any user in a workspace can upload documents. All documents are visible to all workspace members. This enables collaborative knowledge building.

7. **pgvector with HNSW index** - Native Postgres extension for vector similarity. HNSW index for fast approximate nearest neighbor search at scale.

8. **Postgres GIN index for full-text** - Built-in tsvector/tsquery with GIN index. No external search engine needed.

9. **text-embedding-3-small** - 1536 dimensions, good quality/cost balance for RAG use case.

10. **GPT-4o-mini with streaming** - Fast and cost-effective for generating answers. Streaming for better UX.

11. **Similarity threshold (0.7)** - Filters out low-relevance semantic results to improve answer quality.

---

## Time Budget

| Phase | Time | Description |
|-------|------|-------------|
| Setup | 20 min | Next.js, deps, Supabase project |
| Database | 30 min | Schema, RLS, functions, seed workspaces |
| Auth | 30 min | Login, signup, callback, middleware |
| Documents | 30 min | Upload UI, parsing, chunking, embedding |
| Backend | 30 min | RAG pipeline, API endpoint |
| Frontend | 30 min | Chat UI components |
| Docs | 15 min | README |
| **Total** | **~3 hours** | |

---

## Demo Flow

1. **Show signup** - User selects "Acme Corporation" workspace
2. **Login** - Authenticate with created account
3. **Upload document** - Navigate to `/documents`, upload a company profile document
4. **See document** - Document appears in workspace documents list
5. **Go to chat** - Navigate to `/chat`
6. **Ask question** - "What is Acme's annual revenue?"
7. **Show answer** - "$50 million" with source citation from uploaded document
8. **Demonstrate isolation**:
   - Create second user in "TechStart" workspace
   - Show they can't see Acme's documents
   - Upload different document to TechStart
   - Query returns TechStart's data only
9. **Explain** - This demonstrates multi-tenant data isolation with user-uploaded content

---

## Success Criteria

| Requirement | Status |
|-------------|--------|
| Simple UI for Q&A | ☐ |
| **Hybrid RAG** (semantic + keyword + RRF) | ☐ |
| RAG-based answers from knowledge base | ☐ |
| Data stored in Supabase | ☐ |
| README with architecture | ☐ |
| Multi-workspace separation (optional) | ☐ |
| Authentication (user identification) | ☐ |
| User document upload | ☐ |

---

## Files to Create

### Migrations (in order)
1. `001_enable_extensions.sql` - Enable pgvector, uuid-ossp
2. `002_create_tables.sql` - workspaces, users, documents, chunks, embeddings
3. `003_enable_rls.sql` - Enable RLS on all tables
4. `004_create_rls_policies.sql` - Workspace isolation policies
5. `005_create_functions.sql` - match_chunks function
6. `006_seed_workspaces.sql` - Create demo workspaces (NOT documents)

### Lib Files
1. `lib/supabase/client.ts` - Browser Supabase client
2. `lib/supabase/server.ts` - Server Supabase client
3. `lib/supabase/middleware.ts` - Middleware Supabase client
4. `lib/embeddings.ts` - OpenAI embedding generation
5. `lib/chunking.ts` - Text chunking logic
6. `lib/search.ts` - Vector search wrapper
7. `lib/rag.ts` - Complete RAG pipeline

### App Routes
1. `app/page.tsx` - Landing/redirect
2. `app/auth/login/page.tsx` - Login form
3. `app/auth/signup/page.tsx` - Signup with workspace selection
4. `app/auth/callback/route.ts` - Handle auth callback
5. `app/documents/page.tsx` - Document upload + list
6. `app/documents/layout.tsx` - Protected layout
7. `app/chat/page.tsx` - Chat interface
8. `app/chat/layout.tsx` - Protected layout
9. `app/api/documents/route.ts` - Document upload endpoint
10. `app/api/chat/route.ts` - RAG API endpoint
11. `middleware.ts` - Route protection

### Components
1. `components/chat-input.tsx`
2. `components/chat-message.tsx`
3. `components/document-upload.tsx`
4. `components/document-list.tsx`
5. `components/workspace-select.tsx`

---

## Multi-Workspace Data Isolation

### How It Works

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         DATA ISOLATION EXAMPLE                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  WORKSPACE: Acme Corporation                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  Users:                                                              │  │
│  │  - john@acme.com (uploaded company-profile.txt)                      │  │
│  │  - sarah@acme.com (uploaded product-faq.pdf)                         │  │
│  │                                                                      │  │
│  │  Documents (shared):                                                 │  │
│  │  - company-profile.txt → chunks + embeddings                         │  │
│  │  - product-faq.pdf → chunks + embeddings                             │  │
│  │                                                                      │  │
│  │  Queries search ONLY Acme documents                                  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  WORKSPACE: TechStart Inc                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  Users:                                                              │  │
│  │  - alex@techstart.com (uploaded startup-guide.txt)                   │  │
│  │                                                                      │  │
│  │  Documents (shared):                                                 │  │
│  │  - startup-guide.txt → chunks + embeddings                           │  │
│  │                                                                      │  │
│  │  Queries search ONLY TechStart documents                             │  │
│  │  ⚠️ CANNOT see or query Acme's documents                             │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

This plan gives you a complete, working RAG system with:
- ✅ **Hybrid RAG** - Semantic + Keyword search combined with RRF ranking
- ✅ **70/30 weighting** - Semantic (meaning) prioritized, keyword (exact terms) for specifics
- ✅ Authentication (Supabase Auth)
- ✅ Multi-workspace isolation (RLS policies)
- ✅ Pre-seeded workspaces (users select at signup)
- ✅ User-uploaded documents (not pre-seeded)
- ✅ Shared workspace knowledge base (all members can upload and query)
- ✅ pgvector for semantic search (HNSW index)
- ✅ Postgres full-text for keyword search (GIN index)
- ✅ Streaming responses with source citations
