# Feature: Chat Persistence with Conversation History Sidebar

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types, and models. Import from the right files etc.

## Feature Description

Implement persistent chat history so conversations survive page refreshes, with a sidebar showing past conversations. Users can start new chats, continue existing ones, and ask follow-up questions with full conversational context. Each user sees only their own chat history (per-user isolation within workspace).

## User Story

As a workspace user
I want my chat conversations to be saved and accessible
So that I can continue conversations after refreshing, start new chats, and ask follow-up questions that understand previous context

## Problem Statement

Currently, chat messages are stored only in React state and disappear on page refresh. Users cannot:
- Continue conversations after refreshing
- View or return to past conversations
- Ask follow-up questions with context (AI doesn't know what "that" refers to)
- Start fresh conversations while keeping old ones

## Solution Statement

Add database tables for conversations and messages, create a sidebar UI showing conversation history, and include recent message context when calling the LLM. Implement smart context management to optimize costs while maintaining conversational coherence.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium-High
**Primary Systems Affected**: Database schema, Chat API, Chat UI, RAG pipeline
**Dependencies**: Supabase (database), existing auth system

---

## CONTEXT REFERENCES

### Relevant Codebase Files - MUST READ BEFORE IMPLEMENTING!

- `components/features/chat-interface.tsx` - Current chat UI with streaming logic (entire file)
- `components/features/chat-message.tsx` - Message rendering component (entire file)
- `app/chat/page.tsx` - Current split-panel layout (entire file)
- `app/api/chat/route.ts` - Chat API endpoint (entire file)
- `lib/chat.ts` - RAG pipeline with streaming (entire file)
- `lib/db.ts` - Database utilities pattern (entire file)
- `lib/validations/chat.ts` - Zod validation pattern (entire file)
- `types/index.ts` - Type definitions (entire file)
- `supabase/migrations/20260121000006_create_documents_chunks_embeddings.sql` - Migration pattern
- `supabase/migrations/20260121000007_create_rls_policies_documents.sql` - RLS policy pattern
- `components/features/document-list.tsx` - Sidebar list pattern with loading states

### New Files to Create

- `supabase/migrations/YYYYMMDDHHMMSS_create_conversations_messages.sql` - Database schema
- `supabase/migrations/YYYYMMDDHHMMSS_create_conversations_rls.sql` - RLS policies
- `lib/validations/conversations.ts` - Zod schemas for conversation APIs
- `app/api/conversations/route.ts` - List/create conversations endpoint
- `app/api/conversations/[id]/route.ts` - Get/delete single conversation
- `app/api/conversations/[id]/messages/route.ts` - Get messages for conversation
- `components/features/conversation-sidebar.tsx` - Sidebar component
- `components/features/conversation-item.tsx` - Individual conversation in sidebar

### Relevant Documentation

- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
  - Why: Need to implement per-user isolation for conversations
- [OpenAI Chat Completions](https://platform.openai.com/docs/guides/text-generation)
  - Why: Understanding token limits for context window management

### Patterns to Follow

**Naming Conventions:**
- Database: snake_case (e.g., `created_at`, `workspace_id`)
- TypeScript: camelCase for variables, PascalCase for types/components
- API routes: kebab-case directories (e.g., `/api/conversations/[id]/messages`)

**Error Handling Pattern (from `app/api/chat/route.ts`):**
```typescript
return NextResponse.json(
  { error: 'Message here', code: 'ERROR_CODE' },
  { status: 4xx }
);
```

**Database Query Pattern (from `lib/db.ts`):**
```typescript
const supabase = createAdminClient();
const { data, error } = await supabase
  .from('table')
  .select('columns')
  .eq('field', value)
  .order('created_at', { ascending: false });
```

**List Component Pattern (from `document-list.tsx`):**
- Loading state with Skeleton components
- Empty state with helpful message
- Error state with Alert component
- Scrollable area with fixed height
- Hover effects on items

**Zod Validation Pattern (from `lib/validations/chat.ts`):**
```typescript
import { z } from 'zod';
export const schemaName = z.object({...});
export type TypeName = z.infer<typeof schemaName>;
```

---

## IMPLEMENTATION PLAN

### Phase 1: Database Foundation

Create database tables for conversations and messages with proper indexing and RLS policies for per-user isolation.

**Tables:**
- `conversations` - Stores conversation metadata (title, user, timestamps)
- `messages` - Stores individual messages with role, content, sources

### Phase 2: API Layer

Create REST endpoints for conversation CRUD operations and message retrieval.

**Endpoints:**
- `GET /api/conversations` - List user's conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/[id]` - Get single conversation
- `DELETE /api/conversations/[id]` - Delete conversation
- `GET /api/conversations/[id]/messages` - Get messages for conversation
- Update `POST /api/chat` - Accept conversationId, save messages, include context

### Phase 3: Context Management Strategy

**Cost-Optimized Approach:**
- Include last 6 messages (3 turns) as conversation context
- Each message pair ~500 tokens average, so ~1500 tokens for context
- Combined with RAG context (~2000 tokens), total input ~4000 tokens
- gpt-4o-mini: $0.15/1M input tokens = negligible cost increase

**Implementation:**
- Fetch recent messages when generating response
- Format as chat history in system prompt
- Summarize older context if conversation exceeds threshold

### Phase 4: UI Implementation

**Layout Change:**
```
┌─────────────────────────────────────────────────────┐
│                    Chat Page                         │
├────────────┬───────────────┬────────────────────────┤
│ Sidebar    │  Documents    │       Chat             │
│ (Chats)    │  (Upload)     │    Interface           │
│  200px     │   250px       │      flex-1            │
│            │               │                        │
│ - New Chat │ - Dropzone    │ - Messages             │
│ - History  │ - File List   │ - Input                │
│   (scroll) │               │                        │
└────────────┴───────────────┴────────────────────────┘
```

**Components:**
- ConversationSidebar - Left panel with "New Chat" button and conversation list
- ConversationItem - Individual conversation with title, date, delete button

---

## STEP-BY-STEP TASKS

### Task 1: CREATE Database Migration for Tables

**File:** `supabase/migrations/YYYYMMDDHHMMSS_create_conversations_messages.sql`

**IMPLEMENT:**
```sql
-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_workspace ON conversations(workspace_id);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at ASC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- Also update conversation when message is added
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_update_conversation
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();
```

**PATTERN:** Follow `20260121000006_create_documents_chunks_embeddings.sql` structure
**VALIDATE:** Apply migration with Supabase MCP `apply_migration`

---

### Task 2: CREATE RLS Policies Migration

**File:** `supabase/migrations/YYYYMMDDHHMMSS_create_conversations_rls.sql`

**IMPLEMENT:**
```sql
-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can only access their own
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own conversations"
  ON conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own conversations"
  ON conversations FOR DELETE
  USING (user_id = auth.uid());

-- Messages: Users can access messages in their conversations
CREATE POLICY "Users can view messages in own conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND c.user_id = auth.uid()
    )
  );

-- Service role bypass for API operations
CREATE POLICY "Service role full access conversations"
  ON conversations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access messages"
  ON messages FOR ALL
  USING (auth.role() = 'service_role');
```

**PATTERN:** Follow `20260121000007_create_rls_policies_documents.sql` structure
**VALIDATE:** Apply migration with Supabase MCP `apply_migration`

---

### Task 3: UPDATE Types

**File:** `types/index.ts`

**ADD** these type definitions:
```typescript
export interface Conversation {
  id: string;
  user_id: string;
  workspace_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: { filename: string; excerpt: string }[];
  created_at: string;
}
```

**PATTERN:** Follow existing type definitions in file
**VALIDATE:** `pnpm type-check`

---

### Task 4: CREATE Conversation Validation Schemas

**File:** `lib/validations/conversations.ts`

**IMPLEMENT:**
```typescript
import { z } from 'zod';

export const createConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

export type CreateConversationRequest = z.infer<typeof createConversationSchema>;

export const updateConversationSchema = z.object({
  title: z.string().min(1).max(200),
});

export type UpdateConversationRequest = z.infer<typeof updateConversationSchema>;
```

**PATTERN:** Follow `lib/validations/chat.ts`
**VALIDATE:** `pnpm type-check`

---

### Task 5: CREATE Conversations API Route

**File:** `app/api/conversations/route.ts`

**IMPLEMENT:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession, createAdminClient } from '@/lib/db';
import { createConversationSchema } from '@/lib/validations/conversations';

// GET - List user's conversations
export async function GET() {
  const user = await getUserFromSession();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, created_at, updated_at')
    .eq('user_id', user.userId)
    .eq('workspace_id', user.workspaceId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }

  return NextResponse.json({ conversations: data });
}

// POST - Create new conversation
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
    body = {};
  }

  const parsed = createConversationSchema.safeParse(body);
  const title = parsed.success && parsed.data.title ? parsed.data.title : 'New Conversation';

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: user.userId,
      workspace_id: user.workspaceId,
      title,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation', code: 'CREATE_ERROR' },
      { status: 500 }
    );
  }

  return NextResponse.json({ conversation: data }, { status: 201 });
}
```

**PATTERN:** Follow `app/api/documents/route.ts`
**VALIDATE:** `pnpm type-check && pnpm lint`

---

### Task 6: CREATE Single Conversation API Route

**File:** `app/api/conversations/[id]/route.ts`

**IMPLEMENT:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession, createAdminClient } from '@/lib/db';
import { updateConversationSchema } from '@/lib/validations/conversations';

// GET - Get single conversation with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromSession();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  const { id } = await params;
  const supabase = createAdminClient();

  // Verify ownership and get conversation
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.userId)
    .single();

  if (error || !conversation) {
    return NextResponse.json(
      { error: 'Conversation not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  // Get messages
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('id, role, content, sources, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  if (msgError) {
    console.error('Error fetching messages:', msgError);
    return NextResponse.json(
      { error: 'Failed to fetch messages', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }

  return NextResponse.json({ conversation, messages });
}

// PATCH - Update conversation title
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromSession();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON', code: 'INVALID_JSON' },
      { status: 400 }
    );
  }

  const parsed = updateConversationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('conversations')
    .update({ title: parsed.data.title })
    .eq('id', id)
    .eq('user_id', user.userId)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: 'Conversation not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  return NextResponse.json({ conversation: data });
}

// DELETE - Delete conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromSession();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.userId);

  if (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation', code: 'DELETE_ERROR' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
```

**PATTERN:** Follow Next.js 15 dynamic route params pattern (Promise-based)
**VALIDATE:** `pnpm type-check && pnpm lint`

---

### Task 7: UPDATE Chat Validation Schema

**File:** `lib/validations/chat.ts`

**UPDATE** to include conversationId:
```typescript
import { z } from 'zod';

export const chatRequestSchema = z.object({
  question: z.string().min(1).max(2000),
  stream: z.boolean().optional().default(true),
  conversationId: z.string().uuid().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
```

**VALIDATE:** `pnpm type-check`

---

### Task 8: UPDATE Chat Library for Context

**File:** `lib/chat.ts`

**ADD** function to build conversation context and **UPDATE** generators:

```typescript
import OpenAI from 'openai';
import { hybridSearch } from '@/lib/search';
import { createAdminClient } from '@/lib/db';
import type { SearchResult, Message } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a helpful assistant answering questions based on provided documents.
Answer only using the following context. If the answer is not in the context, say "I couldn't find information about that in the available documents."
Be concise and accurate. Always cite which document the information comes from when possible.
Format your response in markdown when appropriate.`;

const CONTEXT_MESSAGE_LIMIT = 6; // Last 3 exchanges (6 messages)

interface RAGContext {
  question: string;
  workspaceId: string;
  conversationId?: string;
}

interface RAGResponse {
  answer: string;
  sources: SearchResult[];
}

// Fetch recent messages for context
async function getConversationContext(conversationId: string): Promise<Message[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, role, content, sources, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(CONTEXT_MESSAGE_LIMIT);

  if (error || !data) return [];
  return data.reverse(); // Chronological order
}

// Build conversation history string
function buildConversationHistory(messages: Message[]): string {
  if (messages.length === 0) return '';

  const history = messages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  return `\n\nPrevious conversation:\n${history}\n\n`;
}

// Build context string from search results
function buildContext(results: SearchResult[]): string {
  return results
    .map((r, i) => `[Document ${i + 1}]:\n${r.text}`)
    .join('\n\n');
}

// Save message to database
export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  sources: { filename: string; excerpt: string }[] = []
): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    role,
    content,
    sources,
  });
}

// Generate title from first message
export async function generateConversationTitle(question: string): Promise<string> {
  // Simple: use first 50 chars of question
  const title = question.length > 50 ? question.substring(0, 47) + '...' : question;
  return title;
}

// Update conversation title
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from('conversations')
    .update({ title })
    .eq('id', conversationId);
}

// Non-streaming RAG response
export async function generateRAGAnswer(config: RAGContext): Promise<RAGResponse> {
  const { question, workspaceId, conversationId } = config;

  // Get conversation history if continuing
  let conversationHistory = '';
  if (conversationId) {
    const messages = await getConversationContext(conversationId);
    conversationHistory = buildConversationHistory(messages);
  }

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
      { role: 'user', content: `Context:\n${context}${conversationHistory}\nQuestion: ${question}` },
    ],
    temperature: 0.5,
    max_completion_tokens: 1000,
  });

  return {
    answer: response.choices[0].message.content || '',
    sources: searchResults,
  };
}

// Transform search results to source format for frontend
function transformSources(results: SearchResult[]): { filename: string; excerpt: string }[] {
  return results.map(r => ({
    filename: r.filename || 'Unknown document',
    excerpt: r.text.substring(0, 150) + (r.text.length > 150 ? '...' : ''),
  }));
}

// Streaming RAG response generator
export async function* generateRAGAnswerStream(
  config: RAGContext
): AsyncGenerator<{ type: 'sources' | 'content' | 'done'; data?: { filename: string; excerpt: string }[] | string }> {
  const { question, workspaceId, conversationId } = config;

  // Get conversation history if continuing
  let conversationHistory = '';
  if (conversationId) {
    const messages = await getConversationContext(conversationId);
    conversationHistory = buildConversationHistory(messages);
  }

  // Search for relevant chunks
  const searchResults = await hybridSearch(question, workspaceId);

  // Yield transformed sources first
  yield { type: 'sources', data: transformSources(searchResults) };

  if (searchResults.length === 0) {
    yield {
      type: 'content',
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
      { role: 'user', content: `Context:\n${context}${conversationHistory}\nQuestion: ${question}` },
    ],
    temperature: 0.5,
    max_completion_tokens: 1000,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield { type: 'content', data: content };
    }
  }

  yield { type: 'done' };
}
```

**IMPORTS:** Add `Message` type import
**VALIDATE:** `pnpm type-check`

---

### Task 9: UPDATE Chat API Route

**File:** `app/api/chat/route.ts`

**UPDATE** to handle conversation persistence:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession, createAdminClient } from '@/lib/db';
import {
  generateRAGAnswerStream,
  saveMessage,
  generateConversationTitle,
  updateConversationTitle
} from '@/lib/chat';
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

  const { question, stream, conversationId } = parsed.data;
  let activeConversationId = conversationId;
  let isNewConversation = false;

  try {
    const supabase = createAdminClient();

    // Create conversation if not provided
    if (!activeConversationId) {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.userId,
          workspace_id: user.workspaceId,
          title: 'New Conversation',
        })
        .select()
        .single();

      if (convError || !newConv) {
        throw new Error('Failed to create conversation');
      }
      activeConversationId = newConv.id;
      isNewConversation = true;
    }

    // Save user message
    await saveMessage(activeConversationId, 'user', question);

    if (stream) {
      // Streaming response
      const encoder = new TextEncoder();
      let fullResponse = '';
      let sources: { filename: string; excerpt: string }[] = [];

      const readable = new ReadableStream({
        async start(controller) {
          try {
            // Send conversation ID first
            const convIdChunk = JSON.stringify({
              type: 'conversation_id',
              data: activeConversationId
            }) + '\n';
            controller.enqueue(encoder.encode(convIdChunk));

            const generator = generateRAGAnswerStream({
              question,
              workspaceId: user.workspaceId,
              conversationId: activeConversationId,
            });

            for await (const chunk of generator) {
              if (chunk.type === 'sources') {
                sources = chunk.data as { filename: string; excerpt: string }[];
              }
              if (chunk.type === 'content') {
                fullResponse += chunk.data as string;
              }
              const data = JSON.stringify(chunk) + '\n';
              controller.enqueue(encoder.encode(data));
            }

            // Save assistant message after streaming completes
            await saveMessage(activeConversationId!, 'assistant', fullResponse, sources);

            // Update title for new conversations
            if (isNewConversation) {
              const title = await generateConversationTitle(question);
              await updateConversationTitle(activeConversationId!, title);
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
      conversationId: activeConversationId,
    });

    // Save messages
    await saveMessage(activeConversationId, 'assistant', response.answer,
      response.sources.map(s => ({ filename: s.filename || '', excerpt: s.text.substring(0, 150) })));

    if (isNewConversation) {
      const title = await generateConversationTitle(question);
      await updateConversationTitle(activeConversationId, title);
    }

    return NextResponse.json({
      ...response,
      conversationId: activeConversationId
    });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Chat generation failed', code: 'CHAT_ERROR' },
      { status: 500 }
    );
  }
}
```

**VALIDATE:** `pnpm type-check && pnpm lint`

---

### Task 10: CREATE Conversation Sidebar Component

**File:** `components/features/conversation-sidebar.tsx`

**IMPLEMENT:**
```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ConversationItem } from './conversation-item';
import type { Conversation } from '@/types';

interface ConversationSidebarProps {
  activeConversationId: string | null;
  onSelectConversation: (id: string | null) => void;
  onNewChat: () => void;
  refreshTrigger?: number;
}

export function ConversationSidebar({
  activeConversationId,
  onSelectConversation,
  onNewChat,
  refreshTrigger = 0,
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/conversations');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations, refreshTrigger]);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete');

      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversationId === id) {
        onSelectConversation(null);
      }
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs">Start a new chat to begin</p>
            </div>
          ) : (
            conversations.map(conversation => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={activeConversationId === conversation.id}
                onSelect={() => onSelectConversation(conversation.id)}
                onDelete={() => handleDelete(conversation.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
```

**PATTERN:** Follow `document-list.tsx` for loading/empty states
**VALIDATE:** `pnpm type-check`

---

### Task 11: CREATE Conversation Item Component

**File:** `components/features/conversation-item.tsx`

**IMPLEMENT:**
```typescript
'use client';

import { useState } from 'react';
import { MessageSquare, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors',
        isActive ? 'bg-accent' : 'hover:bg-accent/50'
      )}
      onClick={onSelect}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{conversation.title}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(conversation.updated_at)}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
              showMenu && 'opacity-100'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
```

**IMPORTS:** May need to add DropdownMenu from shadcn/ui
**VALIDATE:** `pnpm type-check`

---

### Task 12: ADD DropdownMenu Component (if not exists)

**CHECK:** First verify if `components/ui/dropdown-menu.tsx` exists

**IF NOT EXISTS, RUN:**
```bash
npx shadcn@latest add dropdown-menu
```

**VALIDATE:** `pnpm type-check`

---

### Task 13: UPDATE Chat Interface Component

**File:** `components/features/chat-interface.tsx`

**UPDATE** to accept and use conversation state:

```typescript
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './chat-message';
import type { ChatMessage as ChatMessageType } from '@/types';

interface ChatInterfaceProps {
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
}

export function ChatInterface({
  conversationId,
  onConversationCreated
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversation messages when conversationId changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    async function loadMessages() {
      setIsLoadingHistory(true);
      try {
        const response = await fetch(`/api/conversations/${conversationId}`);
        if (!response.ok) throw new Error('Failed to load');
        const data = await response.json();
        setMessages(
          data.messages.map((m: { role: string; content: string; sources?: { filename: string; excerpt: string }[] }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            sources: m.sources || [],
          }))
        );
      } catch (error) {
        console.error('Error loading messages:', error);
        toast.error('Failed to load conversation');
      } finally {
        setIsLoadingHistory(false);
      }
    }

    loadMessages();
  }, [conversationId]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const question = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message immediately
    const userMessage: ChatMessageType = { role: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);

    // Add placeholder for assistant
    const assistantMessage: ChatMessageType = { role: 'assistant', content: '', sources: [] };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          stream: true,
          conversationId: conversationId || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line);

            if (chunk.type === 'conversation_id' && !conversationId) {
              onConversationCreated(chunk.data);
            } else if (chunk.type === 'sources') {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === 'assistant') {
                  last.sources = chunk.data;
                }
                return updated;
              });
            } else if (chunk.type === 'content') {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === 'assistant') {
                  last.content += chunk.data;
                }
                return updated;
              });
            } else if (chunk.type === 'error') {
              throw new Error(chunk.data);
            }
          } catch (parseError) {
            console.error('Parse error:', parseError);
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Remove empty assistant message on error
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === 'assistant' && !last.content) {
          updated.pop();
        }
        return updated;
      });
      toast.error(error instanceof Error ? error.message : 'Failed to get response');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoadingHistory) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-lg font-semibold">Start a conversation</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Ask questions about your uploaded documents
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, i) => (
              <ChatMessage key={i} message={message} />
            ))}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t shrink-0">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your documents..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

**VALIDATE:** `pnpm type-check`

---

### Task 14: UPDATE Chat Page Layout

**File:** `app/chat/page.tsx`

**UPDATE** to include conversation sidebar:

```typescript
'use client';

import { useState, useCallback } from 'react';
import { DocumentDropzone } from '@/components/features/document-dropzone';
import { DocumentList } from '@/components/features/document-list';
import { ChatInterface } from '@/components/features/chat-interface';
import { ConversationSidebar } from '@/components/features/conversation-sidebar';

export default function ChatPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [conversationRefreshTrigger, setConversationRefreshTrigger] = useState(0);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  const handleSelectConversation = useCallback((id: string | null) => {
    setActiveConversationId(id);
  }, []);

  const handleConversationCreated = useCallback((id: string) => {
    setActiveConversationId(id);
    setConversationRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full">
      {/* Left Sidebar - Conversations (200px) */}
      <div className="w-[200px] min-w-[180px] border-r flex flex-col overflow-hidden bg-muted/30">
        <ConversationSidebar
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          refreshTrigger={conversationRefreshTrigger}
        />
      </div>

      {/* Middle Panel - Documents (250px) */}
      <div className="w-[250px] min-w-[200px] border-r flex flex-col overflow-hidden">
        <div className="p-4 flex flex-col h-full overflow-hidden">
          <h2 className="text-lg font-semibold mb-4 shrink-0">Documents</h2>

          <div className="mb-6 shrink-0">
            <DocumentDropzone onUploadComplete={handleUploadComplete} />
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            <DocumentList refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>

      {/* Right Panel - Chat (flex-1) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-4 py-3 shrink-0">
          <h2 className="text-lg font-semibold">Chat</h2>
          <p className="text-sm text-muted-foreground">
            Ask questions about your documents
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatInterface
            conversationId={activeConversationId}
            onConversationCreated={handleConversationCreated}
          />
        </div>
      </div>
    </div>
  );
}
```

**VALIDATE:** `pnpm type-check && pnpm build`

---

## TESTING STRATEGY

### Unit Tests

Test the context building functions in `lib/chat.ts`:
- `buildConversationHistory` with various message counts
- `generateConversationTitle` truncation
- `getConversationContext` limit behavior

### Integration Tests

Test API endpoints:
- `GET /api/conversations` - returns user's conversations only
- `POST /api/conversations` - creates with correct user_id/workspace_id
- `GET /api/conversations/[id]` - returns 404 for other user's conversations
- `DELETE /api/conversations/[id]` - cannot delete other user's conversations
- `POST /api/chat` with conversationId - messages are persisted

### Edge Cases

- User with no conversations sees empty state
- Deleting active conversation resets to new chat state
- Very long conversation titles are truncated
- Rapid message sending doesn't corrupt state
- Conversation context doesn't exceed token limits

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
pnpm type-check
pnpm lint
```

### Level 2: Build

```bash
pnpm build
```

### Level 3: Database Migrations

Use Supabase MCP to apply migrations:
```
mcp__supabase__apply_migration for each migration file
```

### Level 4: Manual Validation

1. **New Chat Flow:**
   - Open chat page (should see empty sidebar)
   - Ask a question
   - Verify conversation appears in sidebar
   - Refresh page - conversation and messages persist

2. **Continue Conversation:**
   - Click existing conversation
   - Messages load
   - Ask follow-up question ("Tell me more about that")
   - AI understands context from previous messages

3. **New Chat Button:**
   - Click "New Chat"
   - Chat area clears
   - Ask new question
   - New conversation created in sidebar

4. **Delete Conversation:**
   - Click menu on conversation
   - Click Delete
   - Conversation removed from sidebar

5. **User Isolation:**
   - Login as different user
   - Verify they don't see first user's conversations

---

## ACCEPTANCE CRITERIA

- [ ] Chat messages persist across page refreshes
- [ ] Sidebar shows user's conversation history (most recent first)
- [ ] "New Chat" button starts fresh conversation
- [ ] Clicking conversation loads its messages
- [ ] Follow-up questions have context from previous messages
- [ ] Each user sees only their own conversations
- [ ] Conversations can be deleted
- [ ] Conversation titles auto-generate from first question
- [ ] All validation commands pass
- [ ] No regressions in existing functionality

---

## COMPLETION CHECKLIST

- [ ] Database migrations applied (conversations + messages tables)
- [ ] RLS policies applied (per-user isolation)
- [ ] Types updated in `types/index.ts`
- [ ] Validation schemas created
- [ ] API routes implemented (conversations CRUD)
- [ ] Chat API updated (saves messages, includes context)
- [ ] Chat library updated (context building functions)
- [ ] Sidebar component created
- [ ] Chat interface updated (loads history, sends conversationId)
- [ ] Chat page layout updated (3-panel)
- [ ] All type checks pass
- [ ] Build succeeds
- [ ] Manual testing confirms all features work

---

## NOTES

### Cost Optimization

- **Context Window:** Limited to 6 messages (~1500 tokens) to keep costs low
- **No Summarization:** For simplicity, we truncate old context rather than summarize
- **gpt-4o-mini:** At $0.15/1M input tokens, context adds ~$0.0002 per request

### Design Decisions

1. **Per-User Isolation:** Conversations belong to users, not workspaces. Users in same workspace share documents but have private chat history.

2. **Auto-Title:** First question becomes title (truncated to 50 chars). No AI-generated titles to avoid extra API calls.

3. **No Edit/Rename:** Keep simple - users can delete unwanted conversations but not rename them.

4. **3-Panel Layout:** Sidebar (200px) + Documents (250px) + Chat (remaining). Works well on 1280px+ screens.

### Future Enhancements (Out of Scope)

- Search within conversations
- Export conversation history
- Rename conversations
- Pin favorite conversations
- Conversation summarization for very long chats
