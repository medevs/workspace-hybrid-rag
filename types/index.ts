// Workspace
export interface Workspace {
  id: string;
  name: string;
  created_at: string;
}

// User
export interface User {
  id: string;
  workspace_id: string;
  email: string;
  created_at: string;
}

// Document
export interface Document {
  id: string;
  workspace_id: string;
  filename: string;
  content_type: string | null;
  file_size: number | null;
  created_by: string | null;
  created_at: string;
}

// Chunk
export interface Chunk {
  id: string;
  document_id: string;
  workspace_id: string;
  text: string;
  chunk_order: number;
  created_at: string;
}

// Search Result
export interface SearchResult {
  chunk_id: string;
  document_id: string;
  text: string;
  chunk_order: number;
  score: number;
  source: 'semantic' | 'keyword' | 'hybrid';
  filename?: string;
}

// Chat Message
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: { filename: string; excerpt: string }[];
}

// Conversation
export interface Conversation {
  id: string;
  user_id: string;
  workspace_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

// Message (database record)
export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: { filename: string; excerpt: string }[];
  created_at: string;
}

// API Response Types
export interface ApiError {
  error: string;
  code: string;
}

export interface DocumentUploadResponse {
  documentId: string;
  filename: string;
  chunks: number;
  message: string;
}
