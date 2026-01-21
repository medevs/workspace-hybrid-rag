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
  let activeConversationId: string = conversationId || '';
  let isNewConversation = false;

  try {
    const supabase = createAdminClient();

    // Create conversation if not provided
    if (!activeConversationId || activeConversationId === '') {
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
