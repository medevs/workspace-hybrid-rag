# Workspace-Based RAG Application

A multi-tenant Retrieval-Augmented Generation system with hybrid search (semantic + keyword) where users join pre-seeded workspaces, upload documents to build a shared knowledge base, and query it through conversational Q&A. Built with Next.js, Supabase, pgvector, and OpenAI.

---

## Claude Code Rules (MUST FOLLOW)

### Documentation
- **ALWAYS** use the **Context7 MCP** (`mcp__context7__resolve-library-id`, `mcp__context7__query-docs`) to get up-to-date documentation for any library or framework before implementing features.

### Database Changes
- **NEVER** use the Supabase MCP `execute_sql` to modify the database schema or data.
- **ALWAYS** write migration files in `supabase/migrations/` for any database changes.
- **ALWAYS** use the Supabase MCP `apply_migration` to run migrations (NOT `execute_sql`).
- When database changes are needed:
  1. Create a new migration file: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
  2. Write the SQL in the migration file
  3. Use `mcp__supabase__apply_migration` to apply it

### Database Analysis
- **USE** the Supabase MCP (`list_tables`, `execute_sql` for SELECT queries, `get_logs`) to **analyze and debug** database issues.
- Supabase MCP is for **READ-ONLY** operations when debugging - never for modifications.

### Testing
- **USE** the **Playwright MCP** for E2E testing and browser automation.
- Run E2E tests to verify critical user flows work correctly.

### Summary
| Task | Tool to Use |
|------|-------------|
| Get library docs | Context7 MCP |
| Analyze database/debug | Supabase MCP (read-only) |
| Change database schema | Write migration file → `apply_migration` |
| Insert seed data | Write migration file → `apply_migration` |
| Run E2E tests | Playwright MCP |

---

## Quick Start

```bash
# Setup
pnpm install
cp .env.local.example .env.local  # Fill in your keys

# Development
pnpm dev          # Frontend + backend (http://localhost:3000)
pnpm type-check   # TypeScript validation
pnpm lint         # ESLint check

# Testing
pnpm test         # Unit tests (Vitest)
# E2E tests run via Playwright MCP (not npm package)

# Build & Deploy
pnpm build
pnpm start        # Production
```

## Tech Stack

**Frontend**: Next.js 15.3.x (App Router), React 19, shadcn/ui, Tailwind CSS 3.4, React Hook Form 7.71 + Zod 4.3
**Backend**: Next.js Route Handlers, TypeScript 5.7, Zod validation
**Database**: Supabase Postgres with pgvector, full-text search (GIN index)
**Auth**: Supabase Auth (email/password) via @supabase/supabase-js 2.90 + @supabase/ssr 0.8
**LLM**: OpenAI SDK 6.16 (gpt-4o-mini for answers, text-embedding-3-small for embeddings)
**Search**: Hybrid RAG (semantic + keyword with RRF ranking)
**Package Manager**: pnpm
**Testing**: Vitest 2.1 (unit), Playwright MCP (E2E)
**Node.js**: 20+ required

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # Route handlers (backend)
│   │   ├── auth/          # Supabase auth endpoints
│   │   ├── documents/     # Document ingestion
│   │   ├── search/        # Hybrid search endpoint
│   │   └── chat/          # Chat/Q&A generation
│   ├── documents/         # Document upload page
│   ├── auth/              # Login/Signup pages
│   │   ├── login/
│   │   ├── signup/        # Signup with workspace selection
│   │   └── callback/
│   ├── chat/              # User Q&A interface
│   └── layout.tsx
├── components/
│   ├── ui/                # shadcn/ui components
│   └── features/          # Feature-specific components
├── lib/
│   ├── supabase/          # Supabase clients (client, server, middleware)
│   ├── db.ts              # Database utilities
│   ├── auth.ts            # Authentication utilities
│   ├── embeddings.ts      # OpenAI embedding generation
│   ├── search.ts          # Hybrid search (pgvector + full-text + RRF)
│   ├── chat.ts            # RAG pipeline orchestration
│   └── utils.ts           # Helper functions
├── types/                 # TypeScript types (shared)
├── middleware.ts          # Auth verification
├── env.ts                 # Zod schema for environment variables
└── supabase/
    └── migrations/        # Database migrations
```

## Core Concepts

**Workspaces**: Pre-seeded tenants (created via migration). Users select a workspace at signup. All data is workspace-scoped.

**No Admin Roles**: Any authenticated user can upload documents to their workspace. All workspace members can view and query all documents.

**Hybrid Search**: Combines pgvector (semantic) + Postgres full-text (keyword) with Reciprocal Rank Fusion (RRF) ranking. 70% semantic weight, 30% keyword weight.

**RAG Pipeline**: Question → embedding → hybrid search (parallel) → RRF merge → top 5 chunks → LLM with context → streaming answer.

## Development Setup

**Prerequisites**: Node.js 20+, pnpm 9+

**Environment variables** (copy `.env.local.example` → `.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Database initialization**:
- Create Supabase project
- Run migrations: `npx supabase db push`
- Migrations create: tables, RLS policies, functions, indexes, and seed workspaces

## Code Conventions

**TypeScript**: Strict mode, no `any` types. Zod for runtime validation of requests/responses.

**Frontend**: Feature-based structure. shadcn/ui only for UI components. Tailwind CSS inline (no .css files). React Hook Form + Zod for all forms.

**Backend**: RESTful endpoints under `/api/`. Workspace validation in every route (via session). Zod schema for request body + query params.

**Authentication**: Supabase middleware checks session. Protected routes require auth. No role checks needed (all users equal).

**Error Handling**: Return JSON: `{ error: "message", code: "ERROR_CODE" }`. Use appropriate HTTP status codes (400, 401, 403, 500).

**Naming**:
- API routes: kebab-case (`/api/documents`, `/api/chat`)
- Components: PascalCase (`DocumentUpload.tsx`, `ChatInterface.tsx`)
- Utilities: camelCase (`generateEmbedding.ts`, `hybridSearch.ts`)
- Types: PascalCase, suffix `Request`/`Response`/`Schema` where applicable

## Workflows & Patterns

**Signup Flow**:
1. User visits `/auth/signup`
2. Fetches available workspaces from database
3. User enters email, password, selects workspace
4. Supabase Auth creates user with workspace_id in metadata
5. Auth callback creates user profile in `users` table
6. Redirect to `/chat`

**Document Upload**:
1. User navigates to `/documents`
2. Uploads file (txt, pdf, docx) → `/api/documents`
3. Backend: parse content, chunk text (500-800 tokens), generate embeddings
4. Store: document, chunks, embeddings (with workspace_id)
5. Document visible to ALL users in same workspace

**User Query Flow**:
1. User types question in chat → `/api/chat` (POST)
2. Backend: generate embedding for question
3. Parallel search: semantic (pgvector) + keyword (full-text)
4. Merge with RRF (70/30 weighting), take top 5 chunks
5. Call OpenAI gpt-4o-mini with prompt + context
6. Stream response back to client with source citations

**Workspace Data Isolation**: Every query filters by `workspace_id` from session. RLS policies enforce at DB level.

## Hybrid Search Strategy

**Why Hybrid?** Neither search alone is perfect:
- Semantic: understands meaning, misses exact terms
- Keyword: finds exact matches, no semantic understanding

**RRF Algorithm**:
```typescript
// Reciprocal Rank Fusion
RRF_score = Σ (1 / (k + rank))  // k = 60

// Merge results
semanticResults.forEach((r, i) => merged.set(r.id, RRF([i+1]) * 0.7));
keywordResults.forEach((r, i) => {
  if (merged.has(r.id)) merged.get(r.id).score += RRF([i+1]) * 0.3;
  else merged.set(r.id, RRF([i+1]) * 0.3);
});
```

**Configuration**:
| Parameter | Value |
|-----------|-------|
| Semantic weight | 0.7 |
| Keyword weight | 0.3 |
| Top K | 5 |
| Similarity threshold | 0.7 |

## Testing Strategy

**Unit Tests** (Vitest, `tests/unit/`): Business logic (chunking, RRF ranking, validation)

**Integration Tests** (Vitest, `tests/integration/`): API endpoints with test database

**E2E Tests** (Playwright MCP): Critical workflows
- User: sign up → select workspace → upload doc → ask question → receive answer
- Multi-workspace: ensure data isolation between workspaces

Run: `pnpm test` for unit tests; E2E tests via Playwright MCP

## Database Schema (Key Tables)

```sql
-- Workspaces (pre-seeded via migration)
workspaces (id, name, created_at)

-- Users (linked to Supabase Auth)
users (id, workspace_id, email, created_at)

-- Documents (user-uploaded)
documents (id, workspace_id, filename, created_by, created_at)

-- Chunks (text segments)
chunks (id, document_id, workspace_id, text, chunk_order)

-- Embeddings (pgvector)
embeddings (id, chunk_id, embedding[1536])

-- Indexes
-- HNSW on embeddings for vector search
-- GIN on chunks.text for full-text search
```

Row-Level Security: Users can only access their workspace's data.

## Common Gotchas & Warnings

**OpenAI API**: Use `max_completion_tokens` (not `max_tokens`) with gpt-4o-mini. Monitor costs via dashboard.

**pgvector Schema**: Functions need `SET search_path = public, extensions` to find the `<=>` operator.

**Chunk Size**: Target 500-800 tokens. Too small = poor context, too large = irrelevant results.

**Session Expiry**: Supabase sessions expire after ~1 hour. Implement refresh token logic.

**Multi-Tenancy**: Always validate `workspace_id` from session. Never trust client-provided IDs.

## Deployment

**Build Check**: `pnpm type-check && pnpm lint && pnpm build`

**Environment**: Set `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` in production secrets.

**Supabase**: Run migrations via `npx supabase db push`. Enable backups.

## Reference Docs

| Document | When to Read |
|----------|--------------|
| `INTERVIEW_TASK_PLAN.md` | Full implementation plan with architecture diagrams |
| `.claude/reference/supabase-setup.md` | Database schema, migrations, RLS policies, hybrid search |
| `.claude/reference/openai-integration.md` | Embeddings, completions, RAG pipeline, cost optimization |
| `.claude/reference/next-js-patterns.md` | App Router, route handlers, middleware, server components |
| `.claude/reference/react-frontend-best-practices.md` | Components, shadcn/ui, forms with Zod, hooks |
| `.claude/reference/testing-and-logging.md` | Vitest setup, integration tests, Playwright MCP E2E |
| `.claude/reference/deployment-best-practices.md` | Local setup, build process, environment variables |

## Key Files to Know

- `middleware.ts` – Auth gate for all protected routes
- `lib/db.ts` – Supabase client + utility queries
- `lib/embeddings.ts` – OpenAI embedding generation
- `lib/search.ts` – Hybrid search logic (semantic + keyword + RRF)
- `lib/chat.ts` – RAG pipeline with streaming
- `app/api/documents/route.ts` – Document ingestion endpoint
- `app/api/chat/route.ts` – Q&A endpoint with streaming

## Commands for Common Tasks

| Task | Command |
|------|---------|
| Add dependency | `pnpm add <package>` |
| Type check | `pnpm type-check` |
| Lint | `pnpm lint` |
| Run tests | `pnpm test` |
| Build | `pnpm build` |
| Start prod | `pnpm start` |
| Push migrations | `npx supabase db push` |
