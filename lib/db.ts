import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

// Admin client for server-side operations (bypasses RLS)
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Get user's workspace from session
export async function getUserFromSession() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  // Get user profile with workspace
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, workspace_id, email')
    .eq('id', user.id)
    .single();

  // If profile exists, return it
  if (profile && !profileError) {
    return {
      userId: profile.id,
      workspaceId: profile.workspace_id,
      email: profile.email
    };
  }

  // Profile doesn't exist - try to create it from user metadata
  const workspaceId = user.user_metadata?.workspace_id;
  if (!workspaceId) {
    console.error('User has no workspace_id in metadata:', user.id);
    return null;
  }

  // Create profile using admin client (bypasses RLS)
  const adminClient = createAdminClient();
  const { data: newProfile, error: createError } = await adminClient
    .from('users')
    .upsert(
      {
        id: user.id,
        email: user.email!,
        workspace_id: workspaceId,
      },
      { onConflict: 'id' }
    )
    .select('id, workspace_id, email')
    .single();

  if (createError || !newProfile) {
    console.error('Failed to create user profile:', createError);
    return null;
  }

  return {
    userId: newProfile.id,
    workspaceId: newProfile.workspace_id,
    email: newProfile.email
  };
}
