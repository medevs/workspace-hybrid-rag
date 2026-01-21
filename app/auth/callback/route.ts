import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/chat';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Create user profile if it doesn't exist
      const workspaceId = data.user.user_metadata?.workspace_id;

      if (workspaceId) {
        const { error: profileError } = await supabase
          .from('users')
          .upsert(
            {
              id: data.user.id,
              email: data.user.email!,
              workspace_id: workspaceId,
            },
            { onConflict: 'id' }
          );

        if (profileError) {
          console.error('Error creating user profile:', profileError);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=Could not authenticate`);
}
