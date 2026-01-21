# OpenAI Integration & Best Practices

## Model Selection (2026)

### Embedding Models

**Recommended: text-embedding-3-small** (Best cost-to-performance)
- **Pricing**: $0.02 per 1M input tokens (Standard), $0.01 (Batch)
- **Dimensions**: 1536
- **Quality**: Excellent for semantic search, RAG, and production use cases
- **Use case**: Default choice for almost all RAG applications

**Alternative: text-embedding-3-large**
- **Pricing**: $0.13 per 1M input tokens (Standard), $0.065 (Batch)
- **Dimensions**: 3072
- **Quality**: Highest quality, but 6.5x more expensive
- **Use case**: Only if text-embedding-3-small gives poor results

### Completion Models

**Recommended: GPT-4o-mini** (Best for RAG)
- **Context**: 128K tokens
- **Quality**: Fast, cost-effective, excellent for RAG-based Q&A
- **Pricing**: ~$0.15/1M input tokens, ~$0.60/1M output tokens
- **Use case**: Default for this project - great balance of speed and quality
- **Important**: Use `max_completion_tokens` (NOT `max_tokens`)

**Alternative: GPT-4o**
- **Context**: 128K tokens
- **Quality**: Higher quality than 4o-mini
- **Pricing**: ~$2.50/1M input tokens, ~$10/1M output tokens
- **Use case**: When answer quality is critical and cost is not a concern

**Alternative: GPT-4 Turbo**
- **Context**: 128K tokens
- **Pricing**: ~$10/1M input tokens, ~$30/1M output tokens
- **Use case**: Legacy - prefer GPT-4o or GPT-4o-mini instead

## Generating Embeddings

### Basic Implementation

**File: `lib/embeddings.ts`**

```typescript
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate embedding for a single text
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    throw new Error('Failed to generate embedding');
  }
}

// Generate embeddings for multiple texts (batched)
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      input: texts,
      encoding_format: 'float',
    });

    // Sort by index to maintain order
    return response.data.sort((a, b) => a.index - b.index).map(d => d.embedding);
  } catch (error) {
    console.error('Batch embedding generation failed:', error);
    throw new Error('Failed to generate embeddings');
  }
}
```

### Batch Processing for Large Documents

For ingesting large documents (100+ chunks), use batch processing:

```typescript
// Batch embed chunks during document ingestion
export async function batchEmbedChunks(
  chunks: Array<{ id: string; text: string }>,
  batchSize = 20
): Promise<Map<string, number[]>> {
  const embeddings = new Map<string, number[]>();

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map(c => c.text);

    try {
      const embeddingResults = await generateEmbeddings(texts);
      batch.forEach((chunk, index) => {
        embeddings.set(chunk.id, embeddingResults[index]);
      });

      // Add delay to respect rate limits
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Failed to embed batch ${i / batchSize}:`, error);
      throw error;
    }
  }

  return embeddings;
}
```

## Generating Answers (RAG)

### Basic RAG Completion with GPT-4o-mini

**File: `lib/chat.ts`**

```typescript
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a helpful assistant answering questions based on provided documents.
Answer only using the following context. If the answer is not in the context, say "I couldn't find information about that in the available documents."
Be concise and accurate. Always cite which document the information comes from when possible.`;

interface RAGContext {
  question: string;
  context: string;
  model?: string;
}

// Non-streaming version
export async function generateRAGAnswer(config: RAGContext): Promise<string> {
  const {
    question,
    context,
    model = process.env.OPENAI_MODEL || 'gpt-4o-mini',
  } = config;

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
      ],
      temperature: 0.5,
      max_completion_tokens: 1000,  // IMPORTANT: Use max_completion_tokens, NOT max_tokens
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('RAG completion failed:', error);
    throw new Error('Failed to generate answer');
  }
}

// Streaming version for real-time responses
export async function* generateRAGAnswerStream(
  config: RAGContext
): AsyncGenerator<string> {
  const {
    question,
    context,
    model = process.env.OPENAI_MODEL || 'gpt-4o-mini',
  } = config;

  const stream = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
    ],
    temperature: 0.5,
    max_completion_tokens: 1000,  // IMPORTANT: Use max_completion_tokens, NOT max_tokens
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
```

### API Route for Chat/Q&A

**File: `app/api/chat/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromHeaders } from '@/lib/db';
import { generateChatResponseStream } from '@/lib/chat';

const ChatSchema = z.object({
  question: z.string().min(1).max(500),
  stream: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  const userContext = getUserFromHeaders(request.headers);

  if (!userContext) {
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

  const parsed = ChatSchema.safeParse(body);
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
            const generator = generateChatResponseStream(question, userContext.workspaceId);
            for await (const chunk of generator) {
              const data = JSON.stringify(chunk) + '\n';
              controller.enqueue(encoder.encode(data));
            }
          } catch (error) {
            console.error('Streaming error:', error);
            const errorChunk = JSON.stringify({
              type: 'error',
              error: error instanceof Error ? error.message : 'Generation failed',
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

    // Non-streaming response
    const response = await generateChatResponse(question, userContext.workspaceId);
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

## Cost Optimization

### 1. **GPT-4o-mini vs GPT-4o**

| Model | Input Cost | Output Cost | Best For |
|-------|------------|-------------|----------|
| gpt-4o-mini | $0.15/1M | $0.60/1M | RAG Q&A (default) |
| gpt-4o | $2.50/1M | $10/1M | Complex reasoning |

**Recommendation**: Use gpt-4o-mini for this project. It's 16x cheaper and fast enough for RAG.

### 2. **Embedding Costs**

| Model | Cost | Dimensions |
|-------|------|------------|
| text-embedding-3-small | $0.02/1M tokens | 1536 |
| text-embedding-3-large | $0.13/1M tokens | 3072 |

**Recommendation**: Use text-embedding-3-small. Quality is excellent for RAG.

### 3. **Caching Embeddings**

```typescript
// Cache question embeddings by hashing
import crypto from 'crypto';

const embeddingCache = new Map<string, number[]>();

function hashText(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

export async function getEmbeddingCached(text: string): Promise<number[]> {
  const hash = hashText(text);
  const cached = embeddingCache.get(hash);
  if (cached) return cached;

  const embedding = await generateEmbedding(text);
  embeddingCache.set(hash, embedding);
  return embedding;
}
```

### 4. **Monitoring Usage**

```typescript
// Track token usage in responses
export function logUsage(response: OpenAI.ChatCompletion) {
  const { prompt_tokens, completion_tokens, total_tokens } = response.usage || {};
  console.log(JSON.stringify({
    type: 'OPENAI_USAGE',
    prompt_tokens,
    completion_tokens,
    total_tokens,
    timestamp: new Date().toISOString(),
  }));
}
```

## Best Practices

**Model Parameter (IMPORTANT)**:
- For gpt-4o-mini and gpt-4o: Use `max_completion_tokens`
- For older models: Use `max_tokens`
- Wrong parameter = 400 error

**Temperature Settings**:
- RAG answers: `temperature = 0.5` (balanced, factual)
- Creative content: `temperature = 0.9` (high variety)
- Extraction: `temperature = 0.0` (deterministic)

**Context Length**:
- Max ~2000 tokens of context (leaves room for question + answer)
- Top 5 relevant chunks are usually sufficient
- Use RRF to rank by relevance

**Error Handling**:
- Catch rate limit errors (429) and retry with exponential backoff
- Catch 400 errors - check parameter names
- Log all API errors with timestamps

**Prompt Engineering**:
- Be specific about output format
- Instruct model not to hallucinate
- Tell model to cite sources
- Use system prompt for consistent behavior

## Environment Variables

```bash
# .env.local
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4o-mini              # For chat completions
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # For embeddings
```

## References

- [OpenAI Pricing](https://platform.openai.com/docs/pricing)
- [OpenAI Models](https://platform.openai.com/docs/models)
- [Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Chat Completions](https://platform.openai.com/docs/guides/chat-completions)
