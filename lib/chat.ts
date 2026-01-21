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
  const { question, workspaceId } = config;

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
      { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
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
