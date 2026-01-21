import { NextResponse } from 'next/server';
import { getUserFromSession, createAdminClient } from '@/lib/db';

export async function GET() {
  const user = await getUserFromSession();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  // Get workspace name
  const supabase = createAdminClient();
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', user.workspaceId)
    .single();

  return NextResponse.json({
    email: user.email,
    workspaceId: user.workspaceId,
    workspaceName: workspace?.name || 'Unknown Workspace',
  });
}
