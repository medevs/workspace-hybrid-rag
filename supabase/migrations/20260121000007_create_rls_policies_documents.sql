-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- Documents: Workspace members can view
CREATE POLICY "Users can view workspace documents"
  ON documents FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Documents: Workspace members can insert
CREATE POLICY "Users can upload documents"
  ON documents FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Documents: Users can delete their own uploads
CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  USING (created_by = auth.uid());

-- Chunks: Workspace members can view
CREATE POLICY "Users can view workspace chunks"
  ON chunks FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Chunks: Workspace members can insert
CREATE POLICY "Users can insert chunks"
  ON chunks FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Chunks: Cascade delete handled by FK, but add policy for direct delete
CREATE POLICY "Users can delete workspace chunks"
  ON chunks FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Embeddings: View through chunk relationship
CREATE POLICY "Users can view workspace embeddings"
  ON embeddings FOR SELECT
  USING (chunk_id IN (
    SELECT id FROM chunks WHERE workspace_id IN
      (SELECT workspace_id FROM users WHERE id = auth.uid())
  ));

-- Embeddings: Insert through chunk relationship
CREATE POLICY "Users can insert embeddings"
  ON embeddings FOR INSERT
  WITH CHECK (chunk_id IN (
    SELECT id FROM chunks WHERE workspace_id IN
      (SELECT workspace_id FROM users WHERE id = auth.uid())
  ));

-- Embeddings: Delete through chunk relationship
CREATE POLICY "Users can delete embeddings"
  ON embeddings FOR DELETE
  USING (chunk_id IN (
    SELECT id FROM chunks WHERE workspace_id IN
      (SELECT workspace_id FROM users WHERE id = auth.uid())
  ));
