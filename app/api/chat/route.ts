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
