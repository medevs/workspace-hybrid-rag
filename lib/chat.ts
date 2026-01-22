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

const QUERY_REWRITE_PROMPT = `You are a query rewriter for a document search system. Your task is to rewrite follow-up questions into standalone, searchable queries.

Given the conversation history and the current question, rewrite the question to be self-contained and specific. The rewritten query should:
1. Include all necessary context from the conversation
2. Resolve pronouns (he, she, it, they, that, this) to their actual referents
3. Be specific enough to find relevant documents
4. Maintain the user's original intent

Examples:
- History: "What tech stack does Ahmed use?" → Answer about JavaScript, Node.js...
  Current: "what else?"
  Rewritten: "What other skills, technologies, experience, or qualifications does Ahmed have besides his tech stack?"

- History: "Tell me about the company's revenue" → Answer about $50 million...
  Current: "and the employees?"
  Rewritten: "How many employees does the company have and what is the employee information?"

- History: "What is John's role?" → Answer about CEO position...
  Current: "tell me more about him"
  Rewritten: "What additional information is available about John, including his background, responsibilities, and achievements?"

IMPORTANT: Return ONLY the rewritten query, nothing else. No explanations, no quotes, just the query.`;

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

// Fetch recent messages for context (excluding the most recent message which is the current question)
async function getConversationContext(conversationId: string): Promise<Message[]> {
  const supabase = createAdminClient();
  // Use range(1, ...) to skip the most recent message (the current user question that was just saved)
  // This ensures we only get PREVIOUS conversation history, not the current question
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, role, content, sources, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(1, CONTEXT_MESSAGE_LIMIT);

  if (error) {
    console.error('[getConversationContext] Error:', error);
    return [];
  }

  console.log(`[getConversationContext] Found ${data?.length || 0} messages for conversation ${conversationId}`);

  if (!data || data.length === 0) return [];
  return data.reverse() as Message[]; // Chronological order
}

// Rewrite follow-up questions to be standalone and searchable
async function rewriteQueryWithContext(
  question: string,
  historyMessages: Message[]
): Promise<string> {
  console.log(`[rewriteQueryWithContext] Question: "${question}", History messages: ${historyMessages.length}`);

  // If no history, return as-is
  if (historyMessages.length === 0) {
    console.log('[rewriteQueryWithContext] No history, returning original question');
    return question;
  }

  // Build conversation history string for the rewriter
  const historyStr = historyMessages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  console.log(`[rewriteQueryWithContext] History preview: ${historyStr.substring(0, 200)}...`);

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: QUERY_REWRITE_PROMPT },
        {
          role: 'user',
          content: `Conversation history:\n${historyStr}\n\nCurrent question: ${question}\n\nRewritten query:`,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent rewrites
      max_completion_tokens: 200,
    });

    const rewrittenQuery = response.choices[0].message.content?.trim();

    // Fallback to original if rewrite fails or is empty
    if (!rewrittenQuery) {
      console.log('[rewriteQueryWithContext] Empty response, returning original');
      return question;
    }

    console.log(`[Query Rewrite] "${question}" → "${rewrittenQuery}"`);
    return rewrittenQuery;
  } catch (error) {
    console.error('[rewriteQueryWithContext] Error:', error);
    return question;
  }
}

// Convert conversation history to OpenAI message format
function buildOpenAIMessages(
  historyMessages: Message[],
  context: string,
  question: string
): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  // Add previous conversation messages in proper multi-turn format
  for (const msg of historyMessages) {
    messages.push({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    });
  }

  // Add current question with document context
  messages.push({
    role: 'user',
    content: `Based on the following documents:\n\n${context}\n\nQuestion: ${question}`,
  });

  return messages;
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

  // Get conversation history if continuing (excludes current message)
  let historyMessages: Message[] = [];
  if (conversationId) {
    historyMessages = await getConversationContext(conversationId);
  }

  // Rewrite query with context for better search results
  const searchQuery = await rewriteQueryWithContext(question, historyMessages);

  // Search for relevant chunks using the rewritten query
  const searchResults = await hybridSearch(searchQuery, workspaceId);

  if (searchResults.length === 0) {
    return {
      answer: "I couldn't find any relevant information in the available documents. Please try a different question or upload more documents.",
      sources: [],
    };
  }

  const context = buildContext(searchResults);
  // Use the rewritten query for LLM prompt so it knows what to answer
  const questionForLLM = searchQuery !== question ? searchQuery : question;
  const messages = buildOpenAIMessages(historyMessages, context, questionForLLM);

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages,
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

  console.log(`[generateRAGAnswerStream] Question: "${question}", ConversationId: ${conversationId}`);

  // Get conversation history if continuing (excludes current message)
  let historyMessages: Message[] = [];
  if (conversationId) {
    historyMessages = await getConversationContext(conversationId);
    console.log(`[generateRAGAnswerStream] Got ${historyMessages.length} history messages`);
  }

  // Rewrite query with context for better search results
  const searchQuery = await rewriteQueryWithContext(question, historyMessages);
  console.log(`[generateRAGAnswerStream] Search query: "${searchQuery}"`);

  // Search for relevant chunks using the rewritten query
  const searchResults = await hybridSearch(searchQuery, workspaceId);
  console.log(`[generateRAGAnswerStream] Found ${searchResults.length} search results`);

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
  // Use the rewritten query for LLM prompt so it knows what to answer
  // This ensures the LLM understands the full context of follow-up questions
  const questionForLLM = searchQuery !== question ? searchQuery : question;
  console.log(`[generateRAGAnswerStream] Question for LLM: "${questionForLLM.substring(0, 100)}..."`);
  const messages = buildOpenAIMessages(historyMessages, context, questionForLLM);

  const stream = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages,
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
