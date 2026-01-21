# Workspace-Based RAG Application

A multi-tenant Retrieval-Augmented Generation (RAG) system with hybrid search capabilities. Users join pre-seeded workspaces, upload documents to build a shared knowledge base, and query it through conversational Q&A with AI-powered responses.

![Next.js](https://img.shields.io/badge/Next.js-15.5-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-green)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-orange)

## Features

- **Multi-tenant Architecture**: Users join pre-seeded workspaces with complete data isolation
- **Document Upload**: Support for PDF and TXT files with automatic text extraction
- **Hybrid Search**: Combines semantic search (pgvector) with keyword search (PostgreSQL full-text) using Reciprocal Rank Fusion (RRF)
- **Conversational Q&A**: Ask questions about your documents with streaming AI responses
- **Chat History**: Persistent conversation history with sidebar navigation
- **Source Citations**: Answers include references to source documents
- **Mobile Responsive**: Full mobile support with slide-out navigation panels
- **Real-time Streaming**: Token-by-token response streaming for better UX

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, Tailwind CSS, shadcn/ui |
| Backend | Next.js Route Handlers, TypeScript |
| Database | Supabase PostgreSQL with pgvector extension |
| Auth | Supabase Auth (email/password) |
| LLM | OpenAI GPT-4o-mini (answers), text-embedding-3-small (embeddings) |
| Search | Hybrid RAG (semantic + keyword with RRF ranking) |
| PDF Processing | unpdf (UnJS ecosystem) |

## Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase account (free tier works)
- OpenAI API key

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd hybrid-workspace-based-rag
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Set up Supabase database

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Enable the `vector` extension in your Supabase dashboard (Database > Extensions)
3. Run the migrations:

```bash
npx supabase db push
```

This will create:
- Tables: `workspaces`, `users`, `documents`, `chunks`, `embeddings`, `conversations`, `messages`
- Vector indexes (HNSW) for semantic search
- Full-text search indexes (GIN) for keyword search
- Row Level Security (RLS) policies for data isolation
- Hybrid search functions
- Seed data with default workspaces

### 5. Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Sign Up
1. Navigate to `/auth/signup`
2. Enter your email and password
3. Select a workspace to join
4. You'll be redirected to the chat interface

### Upload Documents
1. Use the document panel to drag & drop or click to upload files
2. Supported formats: PDF, TXT
3. Documents are automatically chunked and embedded for search

### Ask Questions
1. Type your question in the chat input
2. The system will search your workspace's documents using hybrid search
3. AI generates an answer based on relevant document chunks
4. Source citations are displayed with each response

### Conversation History
- Previous conversations appear in the left sidebar
- Click a conversation to continue it
- Start a new chat with the "New Chat" button

## Project Structure

```
├── app/
│   ├── api/                 # API routes
│   │   ├── auth/            # Authentication endpoints
│   │   ├── chat/            # Q&A with streaming
│   │   ├── conversations/   # Chat history CRUD
│   │   ├── documents/       # Document upload & management
│   │   ├── search/          # Hybrid search endpoint
│   │   └── user/            # User info endpoint
│   ├── auth/                # Auth pages (login, signup)
│   └── chat/                # Main chat interface
├── components/
│   ├── features/            # Feature components
│   ├── layout/              # Layout components (header, nav)
│   └── ui/                  # shadcn/ui components
├── lib/
│   ├── supabase/            # Supabase clients
│   ├── chunking.ts          # Text chunking logic
│   ├── embeddings.ts        # OpenAI embedding generation
│   ├── search.ts            # Hybrid search with RRF
│   └── chat.ts              # RAG pipeline
├── supabase/
│   └── migrations/          # Database migrations
└── types/                   # TypeScript types
```

## How It Works

### Hybrid Search Architecture

The application uses a hybrid search approach that combines:

1. **Semantic Search**: Uses pgvector to find documents with similar meaning
   - Embeddings generated via OpenAI's `text-embedding-3-small` model
   - HNSW index for fast approximate nearest neighbor search

2. **Keyword Search**: Uses PostgreSQL full-text search for exact matches
   - GIN index on document chunks
   - Catches specific terms that semantic search might miss

3. **Reciprocal Rank Fusion (RRF)**: Merges results from both searches
   - Formula: `RRF_score = Σ (1 / (k + rank))` where k = 60
   - Weights: 70% semantic, 30% keyword
   - Returns top 5 most relevant chunks

### RAG Pipeline

```
User Question
     ↓
Generate Embedding
     ↓
┌────────────────────┐
│   Parallel Search  │
├─────────┬──────────┤
│ Semantic│ Keyword  │
└─────────┴──────────┘
     ↓
RRF Merge (70/30)
     ↓
Top 5 Chunks + Context
     ↓
LLM (GPT-4o-mini)
     ↓
Streaming Response
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm type-check` | Run TypeScript compiler check |
| `pnpm test` | Run unit tests (Vitest) |

## Configuration

### Search Tuning

| Parameter | Default | Description |
|-----------|---------|-------------|
| Semantic weight | 0.7 | Weight for semantic search results |
| Keyword weight | 0.3 | Weight for keyword search results |
| Top K | 5 | Number of chunks to retrieve |
| Similarity threshold | 0.7 | Minimum similarity score |

### Chunking

| Parameter | Default | Description |
|-----------|---------|-------------|
| Chunk size | 512 tokens | Target size for each chunk |
| Chunk overlap | 102 tokens | Overlap between consecutive chunks |

## Multi-tenancy

- Each workspace has isolated data
- Users can only access documents in their workspace
- Row Level Security (RLS) enforces isolation at the database level
- All queries automatically filter by `workspace_id`

## License

MIT
