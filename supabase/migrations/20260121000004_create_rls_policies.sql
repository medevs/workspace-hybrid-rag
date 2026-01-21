-- Workspaces: Anyone can view (for signup dropdown)
CREATE POLICY "Anyone can view workspaces"
  ON workspaces FOR SELECT
  USING (true);

-- Users: Can view members of their workspace
CREATE POLICY "Users can view workspace members"
  ON users FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Users: Can insert own profile during signup
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());
