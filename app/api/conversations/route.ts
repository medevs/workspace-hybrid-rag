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
