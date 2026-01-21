-- Fix infinite recursion in users table RLS policy
-- The previous policy referenced the users table itself, causing infinite recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view workspace members" ON users;

-- Create a helper function to get the user's workspace_id without triggering RLS
-- This function runs with SECURITY DEFINER, bypassing RLS
CREATE OR REPLACE FUNCTION get_user_workspace_id(user_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT workspace_id FROM users WHERE id = user_id;
$$;

-- Create new policy that uses the security definer function
-- Users can view all members in their workspace
CREATE POLICY "Users can view workspace members" ON users
  FOR SELECT
  USING (
    workspace_id = get_user_workspace_id(auth.uid())
  );

-- Also fix the policies on other tables that reference users table
-- These could also cause issues when the users policy fails

-- Fix chunks policies
DROP POLICY IF EXISTS "Users can view workspace chunks" ON chunks;
DROP POLICY IF EXISTS "Users can delete workspace chunks" ON chunks;

CREATE POLICY "Users can view workspace chunks" ON chunks
  FOR SELECT
  USING (workspace_id = get_user_workspace_id(auth.uid()));

CREATE POLICY "Users can delete workspace chunks" ON chunks
  FOR DELETE
  USING (workspace_id = get_user_workspace_id(auth.uid()));

-- Fix documents policies
DROP POLICY IF EXISTS "Users can view workspace documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;

CREATE POLICY "Users can view workspace documents" ON documents
  FOR SELECT
  USING (workspace_id = get_user_workspace_id(auth.uid()));

CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE
  USING (
    workspace_id = get_user_workspace_id(auth.uid())
    AND created_by = auth.uid()
  );

-- Fix embeddings policies
DROP POLICY IF EXISTS "Users can view workspace embeddings" ON embeddings;
DROP POLICY IF EXISTS "Users can delete embeddings" ON embeddings;

CREATE POLICY "Users can view workspace embeddings" ON embeddings
  FOR SELECT
  USING (
    chunk_id IN (
      SELECT id FROM chunks WHERE workspace_id = get_user_workspace_id(auth.uid())
    )
  );

CREATE POLICY "Users can delete embeddings" ON embeddings
  FOR DELETE
  USING (
    chunk_id IN (
      SELECT id FROM chunks WHERE workspace_id = get_user_workspace_id(auth.uid())
    )
  );

-- Fix conversations policies
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;

CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND workspace_id = get_user_workspace_id(auth.uid())
  );

CREATE POLICY "Users can delete own conversations" ON conversations
  FOR DELETE
  USING (
    user_id = auth.uid()
    AND workspace_id = get_user_workspace_id(auth.uid())
  );

-- Fix messages policies
DROP POLICY IF EXISTS "Users can view conversation messages" ON messages;

CREATE POLICY "Users can view conversation messages" ON messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE user_id = auth.uid()
    )
  );
