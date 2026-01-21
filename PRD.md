# Product Requirements Document (PRD)
# Workspace-Based RAG Application

**Version:** 1.0
**Date:** January 21, 2026
**Status:** Draft

---

## 1. Executive Summary

The Workspace-Based RAG Application is a multi-tenant Retrieval-Augmented Generation system that enables teams to build shared knowledge bases and query them through natural language Q&A. Users join pre-seeded workspaces, upload documents (PDFs, text files, DOCX), and ask questions that are answered using a hybrid search approach combining semantic understanding with keyword matching.

The core innovation is the **Hybrid RAG Pipeline** using Reciprocal Rank Fusion (RRF) to combine pgvector semantic search with Postgres full-text keyword search. This approach captures both meaning (semantic) and exact terms (keyword), with chunks found in both searches ranking highest. The 70/30 weighting prioritizes understanding while ensuring specific terms aren't missed.

**MVP Goal:** Deliver a functional, multi-tenant RAG system within ~3-4 hours that demonstrates end-to-end document ingestion, hybrid search, and LLM-powered Q&A with workspace-based data isolation.

---

## 2. Mission

### Mission Statement

Enable teams to unlock knowledge trapped in documents through intelligent, context-aware Q&A that understands both meaning and terminology.

### Core Principles

1. **Hybrid Intelligence** - Neither pure semantic nor pure keyword search is sufficient. Combine both for superior retrieval quality.
2. **Data Isolation by Design** - Multi-tenancy through workspace-scoped data with Row-Level Security (RLS) at the database layer.
3. **Collaborative Knowledge Building** - Any workspace member can contribute documents; the knowledge base grows organically.
4. **Simplicity Over Completeness** - Focus on a working end-to-end system rather than feature completeness.
5. **Transparency** - Show source citations for every answer so users can verify and trust the responses.

---

## 3. Target Users

### Primary Persona: Knowledge Worker

- **Role:** Team member in a small-to-medium organization (5-50 people)
- **Technical Comfort:** Moderate; comfortable with web applications, not necessarily technical
- **Pain Points:**
  - Company knowledge is scattered across PDFs, docs, and FAQs
  - Difficult to find specific information quickly
  - New team members struggle to onboard without tribal knowledge
  - Existing search tools miss semantic meaning or exact terminology

### Secondary Persona: Team Lead / Administrator

- **Role:** Person responsible for team productivity and knowledge management
- **Technical Comfort:** Moderate to high
- **Pain Points:**
  - No centralized, searchable knowledge base
  - Team members asking the same questions repeatedly
  - Difficulty measuring what knowledge exists vs. gaps

### Key User Needs

| Need | Priority |
|------|----------|
| Ask questions in natural language | Critical |
| Get answers grounded in actual documents | Critical |
| Upload documents to build knowledge base | Critical |
| See which documents support an answer | High |
| Data isolation between teams/workspaces | High |
| Simple authentication | Medium |

---

## 4. MVP Scope

### In Scope (Core Functionality)

- ✅ User authentication (signup/login) with email/password via Supabase Auth
- ✅ Workspace selection at signup (pre-seeded workspaces)
- ✅ Document upload page with file support (.txt, .pdf, .docx)
- ✅ Document ingestion pipeline: parse → chunk → embed → store
- ✅ Chat interface for Q&A
- ✅ Hybrid RAG pipeline: semantic + keyword search with RRF ranking
- ✅ Streaming LLM responses with source citations
- ✅ Workspace-scoped data isolation (RLS policies)
- ✅ Document list showing all workspace documents

### In Scope (Technical)

- ✅ Next.js 16 App Router with React 19
- ✅ Supabase Postgres with pgvector extension
- ✅ Postgres full-text search with GIN index
- ✅ OpenAI embeddings (text-embedding-3-small)
- ✅ OpenAI completions (gpt-4o-mini) with streaming
- ✅ shadcn/ui component library
- ✅ Zod validation for all inputs
- ✅ TypeScript strict mode

### Out of Scope (Future Phases)

- ❌ User roles / admin permissions (all users equal in MVP)
- ❌ Workspace creation by users (pre-seeded only)
- ❌ Document deletion / editing
- ❌ Conversation history / chat persistence
- ❌ File storage in Supabase Storage (content extracted at upload)
- ❌ Advanced chunking strategies (overlapping, semantic boundaries)
- ❌ Multiple embedding models
- ❌ Cost tracking / usage limits
- ❌ Mobile-optimized UI
- ❌ SSO / OAuth providers (email/password only)
- ❌ Real-time collaboration features
- ❌ API rate limiting

---

## 5. User Stories

### Authentication & Onboarding

1. **As a new user**, I want to create an account and select my workspace, so that I can start using the knowledge base with my team.
   - *Example: User visits signup, enters email/password, selects "Acme Corporation" from dropdown, clicks Create Account.*

2. **As a returning user**, I want to log in quickly, so that I can access my workspace's knowledge base.
   - *Example: User enters email/password on login page, redirected to chat interface.*

### Document Management

3. **As a team member**, I want to upload documents to our workspace, so that our knowledge base grows with relevant information.
   - *Example: User navigates to /documents, uploads "company-profile.pdf", sees it processed and added to document list.*

4. **As a team member**, I want to see all documents in my workspace, so that I know what knowledge is available to query.
   - *Example: User views document list showing filename, upload date, and who uploaded each document.*

### Q&A / Chat

5. **As a team member**, I want to ask questions in natural language, so that I can find information without knowing exact document locations.
   - *Example: User types "What is our company's annual revenue?" and receives an answer extracted from uploaded documents.*

6. **As a team member**, I want to see which documents support an answer, so that I can verify the information and read more context.
   - *Example: Answer shows "Sources: company-profile.pdf, quarterly-report.txt" with relevant excerpts.*

### Multi-Tenancy

7. **As a team member**, I want my workspace's documents to be private, so that other teams cannot see our confidential information.
   - *Example: User in "Acme Corporation" cannot see or query documents uploaded by "TechStart Inc" users.*

### Technical User Stories

8. **As the system**, semantic search should find conceptually similar content even with different wording.
   - *Example: Query "company earnings" returns chunks containing "annual revenue" due to semantic similarity.*

9. **As the system**, keyword search should find exact matches for names, acronyms, and specific terms.
   - *Example: Query "Acme" returns all chunks containing the exact term "Acme".*

10. **As the system**, hybrid search should rank chunks found in both semantic AND keyword results highest.
    - *Example: A chunk matching both semantically and by keyword appears at top of results.*

---

## 6. Core Architecture & Patterns

### High-Level Architecture

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
│  │  │   Auth)     │  │             │  │  uploaded)  │  │ - text      │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └──────┬──────┘  │  │
│  │                                                            │         │  │
│  │  ┌─────────────┐                   ┌─────────────┐         │         │  │
│  │  │   users     │                   │ embeddings  │◀────────┘         │  │
│  │  │ (profiles)  │                   │ (pgvector)  │                   │  │
│  │  └─────────────┘                   └─────────────┘                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
hybrid-workspace-based-rag/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Landing page (redirect)
│   ├── auth/
│   │   ├── login/page.tsx            # Login form
│   │   ├── signup/page.tsx           # Signup + workspace selection
│   │   └── callback/route.ts         # Auth callback handler
│   ├── documents/
│   │   ├── page.tsx                  # Document list + upload
│   │   └── layout.tsx                # Protected layout
│   ├── chat/
│   │   ├── page.tsx                  # Chat interface
│   │   └── layout.tsx                # Protected layout
│   └── api/
│       ├── documents/route.ts        # Document ingestion
│       └── chat/route.ts             # RAG pipeline
├── components/
│   ├── ui/                           # shadcn/ui components
│   ├── chat-input.tsx
│   ├── chat-message.tsx
│   ├── document-upload.tsx
│   ├── document-list.tsx
│   └── workspace-select.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   ├── server.ts                 # Server client
│   │   └── middleware.ts             # Middleware client
│   ├── embeddings.ts                 # OpenAI embeddings
│   ├── chunking.ts                   # Text chunking
│   ├── search.ts                     # Hybrid search + RRF
│   └── chat.ts                       # RAG pipeline
├── types/                            # TypeScript types
├── middleware.ts                     # Auth middleware
├── env.ts                            # Zod env validation
└── supabase/
    └── migrations/                   # Database migrations
```

### Key Design Patterns

1. **Server Components by Default** - Use React Server Components for data fetching; Client Components only when interactivity required.

2. **Route Handlers for API** - Next.js Route Handlers (`route.ts`) for all backend logic. No traditional API routes.

3. **Middleware for Auth** - Single middleware.ts checks session and redirects unauthenticated users.

4. **Service Layer Pattern** - `lib/` contains business logic (embeddings, search, RAG) separate from route handlers.

5. **Zod Validation Everywhere** - All request bodies, query params, and environment variables validated with Zod schemas.

6. **RLS for Data Isolation** - Row-Level Security policies at database layer enforce workspace isolation. Application code doesn't need to filter—database handles it.

---

## 7. Core Features

### 7.1 Authentication System

**Purpose:** Secure user authentication with workspace assignment.

**Operations:**
- Sign up with email/password + workspace selection
- Log in with email/password
- Session management via Supabase Auth
- Protected route middleware

**Key Features:**
- Workspace dropdown populated from database at signup
- User profile created in `users` table with workspace_id
- JWT-based sessions stored in cookies
- Automatic token refresh

### 7.2 Document Ingestion Pipeline

**Purpose:** Process uploaded files into searchable chunks with embeddings.

**Operations:**
1. Parse document content (txt, pdf, docx)
2. Chunk text into 500-800 token segments
3. Generate embeddings via OpenAI
4. Store document, chunks, and embeddings

**Key Features:**
- Workspace-scoped storage (all records tagged with workspace_id)
- Chunking preserves sentence boundaries
- Batch embedding generation for efficiency
- Progress feedback during upload

### 7.3 Hybrid Search System

**Purpose:** Find relevant document chunks using both semantic meaning and keyword matching.

**Operations:**
1. Generate embedding for user query
2. Execute parallel searches:
   - Semantic: pgvector cosine similarity
   - Keyword: Postgres full-text ts_rank
3. Merge results with Reciprocal Rank Fusion (RRF)
4. Return top K chunks

**Key Features:**
- 70% semantic weight, 30% keyword weight
- RRF constant k=60 prevents over-weighting top ranks
- Similarity threshold 0.7 filters low-relevance results
- Chunks found in BOTH searches rank highest

### 7.4 RAG Chat Interface

**Purpose:** Answer user questions using retrieved document context.

**Operations:**
1. Receive user question
2. Execute hybrid search to get relevant chunks
3. Build context from top 5 chunks
4. Send to LLM with system prompt
5. Stream response back with source citations

**Key Features:**
- Streaming responses for better UX
- Source citations with document filenames
- Context window management
- Graceful handling when no relevant documents found

---

## 8. Technology Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.3.x | Full-stack framework (App Router, webpack) |
| TypeScript | 5.7.x | Type safety (bundled with Next.js) |
| Zod | 4.3.x | Runtime validation (Zod 4 stable) |
| @supabase/supabase-js | 2.90.x | Database client |
| @supabase/ssr | 0.8.x | Server-side auth helpers |
| OpenAI SDK | 6.16.x | Embeddings & completions |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.0.0 | UI framework (bundled with Next.js 15) |
| shadcn/ui | latest | Component library |
| Tailwind CSS | 3.4.x | Styling (production stable) |
| React Hook Form | 7.71.x | Form handling |
| @hookform/resolvers | 5.x | Zod resolver with type inference |
| lucide-react | 0.469.x | Icons |
| class-variance-authority | 0.7.x | Component variants |
| clsx | 2.1.x | Class name utility |
| tailwind-merge | 2.6.x | Tailwind class merging (v3 compatible) |

### Database

| Technology | Version | Purpose |
|------------|---------|---------|
| Supabase Postgres | 15.x | Primary database |
| pgvector | 0.7.x | Vector similarity search |
| Postgres FTS | built-in | Full-text keyword search |

### External Services

| Service | Purpose |
|---------|---------|
| Supabase Auth | Authentication |
| OpenAI API | Embeddings (text-embedding-3-small) |
| OpenAI API | Completions (gpt-4o-mini) |

### Development

| Tool | Version | Purpose |
|------|---------|---------|
| pnpm | 9.x | Package manager |
| Node.js | 20+ | Runtime (required minimum) |
| Vitest | 2.1.x | Unit testing (production stable) |
| @vitejs/plugin-react | 4.3.x | Vitest React support |
| @testing-library/react | 16.1.x | React testing utilities |
| jsdom | 25.x | DOM testing environment |
| Playwright MCP | - | E2E testing (via MCP server, not npm package) |
| ESLint | latest | Linting (bundled with Next.js) |

---

## 9. Security & Configuration

### Authentication

- **Method:** Email/password via Supabase Auth
- **Session:** JWT stored in HTTP-only cookies
- **Token Refresh:** Automatic via Supabase middleware
- **Protected Routes:** `/chat/*`, `/documents/*`

### Data Isolation

- **Row-Level Security (RLS):** Enabled on all tables
- **Workspace Scoping:** Every query filtered by user's workspace_id
- **Policy Enforcement:** Database-level, not application-level

### Configuration (Environment Variables)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY=       # Service role key (server-only)

# OpenAI
OPENAI_API_KEY=                  # OpenAI API key
OPENAI_MODEL=gpt-4o-mini         # Completion model
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # Embedding model

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Security Scope

**In Scope:**
- ✅ Authentication required for all data access
- ✅ Workspace isolation via RLS
- ✅ Server-side validation of all inputs
- ✅ Environment variables for secrets

**Out of Scope (MVP):**
- ❌ Rate limiting
- ❌ Audit logging
- ❌ IP whitelisting
- ❌ Two-factor authentication
- ❌ API key management

---

## 10. API Specification

### POST /api/documents

Upload and process a document.

**Request:**
```
Content-Type: multipart/form-data

file: File (required) - Document file (.txt, .pdf, .docx)
```

**Response (200 OK):**
```json
{
  "documentId": "uuid",
  "filename": "company-profile.pdf",
  "chunks": 12,
  "message": "Document processed successfully"
}
```

**Error Response (400):**
```json
{
  "error": "Unsupported file type",
  "code": "INVALID_FILE_TYPE"
}
```

### POST /api/chat

Send a question and receive a streamed answer.

**Request:**
```json
{
  "question": "What is Acme's annual revenue?"
}
```

**Response (200 OK, streaming):**
```
data: {"type": "chunk", "content": "Based on"}
data: {"type": "chunk", "content": " the documents"}
data: {"type": "chunk", "content": ", Acme's annual revenue is $50 million."}
data: {"type": "sources", "sources": [{"filename": "company-profile.pdf", "excerpt": "..."}]}
data: [DONE]
```

**Error Response (400):**
```json
{
  "error": "Question is required",
  "code": "MISSING_QUESTION"
}
```

---

## 11. Success Criteria

### MVP Success Definition

The MVP is successful when a user can:
1. Sign up and select a workspace
2. Upload at least one document
3. Ask a question about the document
4. Receive a relevant answer with source citation
5. Verify their data is isolated from other workspaces

### Functional Requirements

- ✅ User can create account with workspace selection
- ✅ User can log in and access their workspace
- ✅ User can upload .txt, .pdf, .docx files
- ✅ Documents are chunked and embedded
- ✅ User can ask natural language questions
- ✅ System returns relevant answers from documents
- ✅ Answers include source citations
- ✅ Workspace data is isolated (verified via test)

### Quality Indicators

| Indicator | Target |
|-----------|--------|
| Search relevance | Top result is relevant >80% of time |
| Response latency | <5 seconds for answer generation |
| Upload processing | <30 seconds for typical document |
| Build success | Zero TypeScript errors |
| Test coverage | Critical paths covered by E2E |

### User Experience Goals

- Clear feedback during document upload
- Streaming responses feel responsive
- Error messages are actionable
- Navigation is intuitive (no more than 2 clicks to any feature)

---

## 12. Implementation Phases

### Phase 1: Project Foundation

**Goal:** Set up project infrastructure and development environment.

**Deliverables:**
- ✅ Initialize Next.js 16 with TypeScript and Tailwind
- ✅ Install dependencies (Supabase, OpenAI, shadcn/ui)
- ✅ Configure environment variables with Zod validation
- ✅ Set up Supabase project

**Validation:** `pnpm build` succeeds with no errors.

---

### Phase 2: Database & Migrations

**Goal:** Create complete database schema with RLS and search functions.

**Deliverables:**
- ✅ Migration: Enable pgvector extension
- ✅ Migration: Create tables (workspaces, users, documents, chunks, embeddings)
- ✅ Migration: Enable RLS on all tables
- ✅ Migration: Create RLS policies for workspace isolation
- ✅ Migration: Create hybrid search functions (semantic + keyword)
- ✅ Migration: Seed demo workspaces
- ✅ Create HNSW index on embeddings
- ✅ Create GIN index on chunks.text

**Validation:** Migrations apply successfully; test queries return expected results.

---

### Phase 3: Authentication

**Goal:** Implement complete auth flow with workspace selection.

**Deliverables:**
- ✅ Create Supabase clients (browser, server, middleware)
- ✅ Build login page with form validation
- ✅ Build signup page with workspace dropdown
- ✅ Implement auth callback handler (creates user profile)
- ✅ Create middleware for route protection

**Validation:** User can sign up, select workspace, log in, and access protected routes.

---

### Phase 4: Document Ingestion

**Goal:** Enable document upload and processing.

**Deliverables:**
- ✅ Build document upload UI component
- ✅ Implement file parsing utilities (txt, pdf, docx)
- ✅ Implement text chunking logic (500-800 tokens)
- ✅ Implement embedding generation via OpenAI
- ✅ Create POST /api/documents endpoint
- ✅ Build document list component

**Validation:** Upload a document; verify chunks and embeddings in database.

---

### Phase 5: Hybrid RAG Pipeline

**Goal:** Implement hybrid search and LLM generation.

**Deliverables:**
- ✅ Implement semantic search (pgvector cosine)
- ✅ Implement keyword search (full-text ts_rank)
- ✅ Implement RRF merging with 70/30 weighting
- ✅ Implement context building from top chunks
- ✅ Implement LLM generation with streaming
- ✅ Create POST /api/chat endpoint

**Validation:** Ask question; receive relevant answer from uploaded document.

---

### Phase 6: Chat Frontend

**Goal:** Build complete chat interface.

**Deliverables:**
- ✅ Create chat page layout (protected)
- ✅ Build chat input component
- ✅ Build message display with streaming support
- ✅ Display source citations
- ✅ Handle loading and error states

**Validation:** Full Q&A flow works end-to-end with good UX.

---

### Phase 7: Testing & Documentation

**Goal:** Ensure quality and document the system.

**Deliverables:**
- ✅ Write unit tests for chunking and RRF logic
- ✅ Write E2E test for complete user flow
- ✅ Write E2E test for workspace isolation
- ✅ Create README with architecture and setup instructions

**Validation:** All tests pass; another developer can set up from README.

---

## 13. Future Considerations

### Post-MVP Enhancements

1. **Conversation History** - Persist chat sessions and allow follow-up questions with context.

2. **Advanced Chunking** - Semantic chunking based on document structure; overlapping chunks for better context.

3. **User Roles** - Admin role for workspace management; viewer role for read-only access.

4. **Document Management** - Delete documents; re-process documents; document versioning.

5. **Multiple File Formats** - Excel, CSV, markdown, HTML support.

### Integration Opportunities

1. **Slack/Teams Integration** - Query the knowledge base from chat apps.

2. **Webhook Notifications** - Alert when new documents are added or answers are generated.

3. **Analytics Dashboard** - Track question frequency, popular documents, unanswered queries.

4. **External Storage** - Support for Google Drive, Dropbox, SharePoint document sources.

### Advanced Features

1. **Query Suggestions** - Auto-suggest questions based on document content.

2. **Answer Feedback** - Thumbs up/down to improve retrieval quality over time.

3. **Multi-Language Support** - Embedding models and search for non-English documents.

4. **Custom Embedding Models** - Support for open-source or domain-specific embeddings.

---

## 14. Risks & Mitigations

### Risk 1: OpenAI API Latency

**Description:** High latency from OpenAI API could make the chat experience feel slow.

**Mitigation:**
- Use streaming responses to show partial answers immediately
- Use gpt-4o-mini (faster than gpt-4)
- Show "thinking" indicator during search phase

---

### Risk 2: Poor Search Relevance

**Description:** Hybrid search may not return relevant chunks for certain queries.

**Mitigation:**
- Tune semantic/keyword weights (start with 70/30, adjust based on testing)
- Lower similarity threshold if too strict
- Include "no relevant documents found" handling

---

### Risk 3: Large Document Processing

**Description:** Very large documents may timeout during upload.

**Mitigation:**
- Set reasonable file size limit (10MB for MVP)
- Process in chunks with progress feedback
- Use async processing for large files (future)

---

### Risk 4: Cost Overruns (OpenAI)

**Description:** Embedding and completion costs could exceed expectations.

**Mitigation:**
- Use text-embedding-3-small (cheaper, good quality)
- Use gpt-4o-mini (cost-effective for RAG)
- Monitor costs in OpenAI dashboard
- Add usage limits in future version

---

### Risk 5: Workspace Data Leakage

**Description:** Bug in RLS policies could expose data across workspaces.

**Mitigation:**
- Test RLS policies explicitly with different user contexts
- Include E2E test for workspace isolation
- Database-level enforcement (not application logic)

---

## 15. Appendix

### A. Database Schema Reference

```sql
-- Core tables
workspaces (id UUID, name TEXT, created_at TIMESTAMPTZ)
users (id UUID, workspace_id UUID, email TEXT, created_at TIMESTAMPTZ)
documents (id UUID, workspace_id UUID, filename TEXT, created_by UUID, created_at TIMESTAMPTZ)
chunks (id UUID, document_id UUID, workspace_id UUID, text TEXT, chunk_order INT)
embeddings (id UUID, chunk_id UUID, embedding VECTOR(1536))

-- Indexes
HNSW on embeddings.embedding (for fast vector search)
GIN on chunks.text (for fast full-text search)
```

### B. RRF Algorithm Reference

```typescript
// Reciprocal Rank Fusion
function calculateRRFScore(rank: number, k: number = 60): number {
  return 1 / (k + rank);
}

// Merge with weights
semanticResults.forEach((r, i) => {
  merged.set(r.id, calculateRRFScore(i + 1) * 0.7);
});
keywordResults.forEach((r, i) => {
  const existing = merged.get(r.id);
  if (existing) {
    existing.score += calculateRRFScore(i + 1) * 0.3; // Hybrid match
  } else {
    merged.set(r.id, calculateRRFScore(i + 1) * 0.3);
  }
});
```

### C. Related Documents

| Document | Purpose |
|----------|---------|
| `PLAN.md` | Detailed implementation plan with diagrams |
| `CLAUDE.md` | Developer guidelines and conventions |
| `.claude/reference/` | Technical reference docs |

### D. Key Dependencies

| Package | Documentation |
|---------|--------------|
| @supabase/supabase-js | https://supabase.com/docs |
| @supabase/ssr | https://supabase.com/docs/guides/auth/server-side |
| openai | https://platform.openai.com/docs |
| pgvector | https://github.com/pgvector/pgvector |

---

*Document generated for Workspace-Based RAG Application*
