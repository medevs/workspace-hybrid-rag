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
